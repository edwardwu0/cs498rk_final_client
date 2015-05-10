var appControllers = angular.module('appControllers', []);

appControllers.controller('SearchController', ['$scope', '$http', 'CourseService', 'ProfessorService', function ($scope, $http, CourseService, ProfessorService) {
  var params = {};//{select: {name: 1, email: 1, _id: 1, pendingTasks: 1}};
  CourseService.get(params)
    .success(function (data, status) {
      $scope.courses = data.data;
      $scope.message = data.message;
      $scope.status = status;
    })
    .error(function (data, status) {
    });
  ProfessorService.get(params)
    .success(function (data, status) {
      $scope.profs = data.data;
      $scope.message = data.message;
      $scope.status = status;
    })
    .error(function (data, status) {
    });

}]);

appControllers.controller('CourseController', ['$scope', '$q', '$http', '$routeParams', 'CourseService', 'ProfessorService', 'ReviewService', 'CommentService', 'AuthService', 'UserService', function ($scope, $q, $http, $routeParams, CourseService, ProfessorService, ReviewService, CommentService, AuthService, UserService) {
  var id = $routeParams.id;

  AuthService.getUser()
    .then(function (data) {
      $scope.currentUser = data._id;
    });


  CourseService.getById(id)
    .then(function (res) {
      $scope.course = res.data.data;

      topNProfessors(3, $scope.course.professors);
      var reviewParams = {where: {course: id}};
      return ReviewService.get(reviewParams);
    }, function () {
      //TODO: do error handling
      console.log('ERROR');
      $q.reject();
    })
    .then(function (res) {
      $scope.reviews = res.data.data;
      retrieveComments();
      $scope.ratingAverage = reviewAverage($scope.reviews);
      getVotes();
    })
  ;

  function reviewAverage(reviews) {
    if (reviews.length == 0)
      return 0;
    var average = 0;

    reviews.forEach(function (review) {
      average += review.rating;
    });

    return average / reviews.length;
  }

  function topNProfessors(n, professors) {
    //dictionary of professor ids and their average rating
    var profAvgRatings = {};

    var reviewList = [];

    //Get the average rating for each professor for this course
    professors.forEach(function (profId) {
      reviewList.push(getReviews({where: {professor: profId, course: id}}, function (reviews) {
        if (reviews.length == 0)
          profAvgRatings[profId] = 0;
        else {
          profAvgRatings[profId] = reviewAverage(reviews);
        }
      }));
    });

    $q.all(reviewList)
      .then(function () {

        //get n best professors
        var bestProfsList = getSortedKeys(profAvgRatings).splice(0, n);


        //get names for n best professors
        var bestProfs = [];
        var nameList = [];

        bestProfsList.forEach(function (profId) {
          nameList.push(getProfessor(profId, function (professor) {
            bestProfs.push({name: professor.name, rating: profAvgRatings[profId]});
          }));
        });

        $q.all(nameList)
          .then(function () {
            $scope.topProfs = bestProfs;
          });
      });

  }

  function retrieveComments() {

    var commentList = [];

    $scope.reviews.forEach(function(review, i) {
      commentList.push(getComments(review, function(comments) {
        $scope.reviews[i].commentList = comments;
      }));
    });

    $q.all(commentList)
      .then(function() {
        var userList = [];

        $scope.reviews.forEach(function(review, i) {
          if (typeof review.commentList != 'undefined') {
            review.commentList.forEach(function (comment, j) {
              userList.push(getUser(comment, function (user) {
                $scope.reviews[i].commentList[j].username = user.facebookId; //TODO: change form facebookId to name
              }));
            });
          }
        });

        $q.all(userList);
      });
  }

  function updateReview(index) {
    var review = $scope.reviews[index];
    ReviewService.updateByObj(review)
      .then(function (res) {
        console.log(res.data.data);
        $scope.reviews[index] = res.data.data;
        getVotes();
        retrieveComments();
      });
  }

  function getComments(review, callback) {
    var params = {where: {review: review._id}};
    CommentService.get(params)
      .success(function (data) {
        callback(data.data);
      });
  }

  function getUser(comment, callback) {
    var params = {where: {_id: comment.user}};
    UserService.get(params)
      .success(function (data) {
        callback(data.data);
      });
  }

  function getVotes() {
    for (var i = 0; i < $scope.reviews.length; i++) {
      $scope.reviews[i].votes = $scope.reviews[i].upvotes.length - $scope.reviews[i].downvotes.length
    }
  }

  function createComment(index, message) {
    var comment = {
      review: $scope.reviews[index]._id,
      user: $scope.currentUser,
      body: message
    };

    console.log(comment);

    CommentService.post(comment)
      .then(function(res) {
        var commentId = res.data.data._id;

        $scope.reviews[index].comments.push(commentId);
        updateReview(index);
      });

  }

  $scope.submitComment = function (index) {
    if (typeof $scope.currentUser != 'undefined' && $scope.reviews[index].userInput.length > 0) {
      console.log(index + ': ' + $scope.reviews[index].userInput);
      createComment(index, $scope.reviews[index].userInput);
      retrieveComments();
    } else {
      //TODO: handle unauthorized
    }
  };

  $scope.upvote = function (index) {
    if (typeof $scope.currentUser == 'undefined')
      return;

    var currentUser = $scope.currentUser;

    var i = $scope.reviews[index].upvotes.indexOf(currentUser);
    if (i == -1) {
      $scope.reviews[index].upvotes.push(currentUser);
    } else {
      $scope.reviews[index].upvotes.splice(i, 1);
    }

    var j = $scope.reviews[index].downvotes.indexOf(currentUser);
    if (j > -1) {
      $scope.reviews[index].downvotes.splice(j, 1);
    }

    getVotes();
    updateReview(index);
  };

  $scope.downvote = function (index) {
    if (typeof $scope.currentUser == 'undefined')
      return;

    var currentUser = $scope.currentUser;

    var i = $scope.reviews[index].downvotes.indexOf(currentUser);
    if (i == -1) {
      $scope.reviews[index].downvotes.push(currentUser);
    } else {
      $scope.reviews[index].downvotes.splice(i, 1);
    }

    var j = $scope.reviews[index].upvotes.indexOf(currentUser);
    if (j > -1) {
      $scope.reviews[index].upvotes.splice(j, 1);
    }

    getVotes();
    updateReview(index);
  };

  function getSortedKeys(obj) {
    var keys = [];
    for (var key in obj) keys.push(key);
    return keys.sort(function (a, b) {
      return obj[a] - obj[b]
    });
  }

  function getProfessor(id, callback) {
    return ProfessorService.getById(id)
      .success(function (value) {
        callback(value.data);
      });
  }

  function getReviews(param, callback) {
    return ReviewService.get(param)
      .success(function (value) {
        callback(value.data);
      });
  }

}]);


appControllers.controller('ProfController', ['$scope', '$q', '$http', '$routeParams', 'CourseService', 'ProfessorService', 'ReviewService', 'CommentService', 'UserService', 'AuthService', function ($scope, $q, $http, $routeParams, CourseService, ProfessorService, ReviewService, CommentService, UserService, AuthService) {
  var id = $routeParams.id;

  AuthService.getUser()
    .then(function (data) {
      $scope.currentUser = data._id;
    });


  ProfessorService.getById(id)
    .then(function (res) {
      $scope.professor = res.data.data;

      topNCourses(3, $scope.professor.courses);
      var reviewParams = {where: {professor: id}};
      return ReviewService.get(reviewParams);
    }, function () {
      //TODO: do error handling
      console.log('ERROR');
      $q.reject();
    })
    .then(function (res) {
      $scope.reviews = res.data.data;
      retrieveComments();
      $scope.ratingAverage = reviewAverage($scope.reviews);
      getVotes();
    })
  ;

  function reviewAverage(reviews) {
    if (reviews.length == 0)
      return 0;
    var average = 0;

    reviews.forEach(function (review) {
      average += review.rating;
    });

    return average / reviews.length;
  }

  function topNCourses(n, courses) {
    //dictionary of professor ids and their average rating
    var courseAvgRatings = {};

    var reviewList = [];

    console.log(courses);

    //Get the average rating for each professor for this course
    courses.forEach(function (courseId) {
      reviewList.push(getReviews({where: {professor: id, course: courseId}}, function (reviews) {
        if (reviews.length == 0)
          courseAvgRatings[courseId] = 0;
        else {
          courseAvgRatings[courseId] = reviewAverage(reviews);
        }
      }));
    });

    $q.all(reviewList)
      .then(function () {

        console.log(courseAvgRatings);

        //get n best professors
        var bestCoursesList = getSortedKeys(courseAvgRatings).splice(0, n);

        //get names for n best professors
        var bestCourses = [];
        var nameList = [];

        bestCoursesList.forEach(function (profId) {
          nameList.push(getCourse(profId, function (professor) {
            bestCourses.push({name: professor.name, rating: courseAvgRatings[profId]});
          }));
        });

        $q.all(nameList)
          .then(function () {
            console.log(bestCourses);
            $scope.topCourses = bestCourses;
          });
      });

  }

  function retrieveComments() {

    var commentList = [];

    $scope.reviews.forEach(function(review, i) {
      commentList.push(getComments(review, function(comments) {
        $scope.reviews[i].commentList = comments;
      }));
    });

    $q.all(commentList)
      .then(function() {
        var userList = [];

        $scope.reviews.forEach(function(review, i) {
          if (typeof review.commentList != 'undefined') {
            review.commentList.forEach(function (comment, j) {
              userList.push(getUser(comment, function (user) {
                $scope.reviews[i].commentList[j].username = user.facebookId; //TODO: change form facebookId to name
              }));
            });
          }
        });

        $q.all(userList);
      });
  }

  function updateReview(index) {
    var review = $scope.reviews[index];
    ReviewService.updateByObj(review)
      .then(function (res) {
        console.log(res.data.data);
        $scope.reviews[index] = res.data.data;
        getVotes();
        retrieveComments();
      });
  }

  function getComments(review, callback) {
    var params = {where: {review: review._id}};
    CommentService.get(params)
      .success(function (data) {
        callback(data.data);
      });
  }

  function getUser(comment, callback) {
    var params = {where: {_id: comment.user}};
    UserService.get(params)
      .success(function (data) {
        callback(data.data);
      });
  }

  function getVotes() {
    for (var i = 0; i < $scope.reviews.length; i++) {
      $scope.reviews[i].votes = $scope.reviews[i].upvotes.length - $scope.reviews[i].downvotes.length
    }
  }

  function createComment(index, message) {
    var comment = {
      review: $scope.reviews[index]._id,
      user: $scope.currentUser,
      body: message
    };

    console.log(comment);

    CommentService.post(comment)
      .then(function(res) {
        var commentId = res.data.data._id;

        $scope.reviews[index].comments.push(commentId);
        updateReview(index);
      });

  }

  $scope.submitComment = function (index) {
    if (typeof $scope.currentUser != 'undefined' && $scope.reviews[index].userInput.length > 0) {
      console.log(index + ': ' + $scope.reviews[index].userInput);
      createComment(index, $scope.reviews[index].userInput);
      retrieveComments();
    } else {
      //TODO: handle unauthorized
    }
  };

  $scope.upvote = function (index) {
    if (typeof $scope.currentUser == 'undefined')
      return;

    var currentUser = $scope.currentUser;

    var i = $scope.reviews[index].upvotes.indexOf(currentUser);
    if (i == -1) {
      $scope.reviews[index].upvotes.push(currentUser);
    } else {
      $scope.reviews[index].upvotes.splice(i, 1);
    }

    var j = $scope.reviews[index].downvotes.indexOf(currentUser);
    if (j > -1) {
      $scope.reviews[index].downvotes.splice(j, 1);
    }

    getVotes();
    updateReview(index);
  };

  $scope.downvote = function (index) {
    if (typeof $scope.currentUser == 'undefined')
      return;

    var currentUser = $scope.currentUser;

    var i = $scope.reviews[index].downvotes.indexOf(currentUser);
    if (i == -1) {
      $scope.reviews[index].downvotes.push(currentUser);
    } else {
      $scope.reviews[index].downvotes.splice(i, 1);
    }

    var j = $scope.reviews[index].upvotes.indexOf(currentUser);
    if (j > -1) {
      $scope.reviews[index].upvotes.splice(j, 1);
    }

    getVotes();
    updateReview(index);
  };

  function getSortedKeys(obj) {
    var keys = [];
    for (var key in obj) keys.push(key);
    return keys.sort(function (a, b) {
      return obj[a] - obj[b]
    });
  }

  function getCourse(id, callback) {
    return CourseService.getById(id)
      .success(function (value) {
        callback(value.data);
      });
  }

  function getReviews(param, callback) {
    return ReviewService.get(param)
      .success(function (value) {
        callback(value.data);
      });
  }

}]);

appControllers.controller('ReviewController', ['$scope', '$location', '$http', '$routeParams', 'CourseService', 'ProfessorService', 'ReviewService', function ($scope, $location, $http, $routeParams, CourseService, ProfessorService, ReviewService) {
  var profId = $routeParams.profId;
  var courseId = $routeParams.courseId;
  var reviewId = $routeParams.reviewId;

  if (typeof reviewId != 'undefined')
    $scope.returnAddress = '#/search';
  if (typeof profId != 'undefined')
    $scope.returnAddress = '#/professor/' + profId;
  if (typeof courseId != 'undefined')
    $scope.returnAddress = '#/course/' + courseId;

  $scope.disableCourse = false;
  $scope.disableProf = false;

  $scope.mode = 'Add';
  $scope.displayText = '';
  $scope.showMessage = false;
  $scope.error = false;
  $scope.validReview = true;

  $scope.review = {
    user: '554d8c2b2edcce772e01e895', //TODO: change once we have authentication
    course: typeof courseId != 'undefined' ? courseId : '',
    rating: '',
    professor: typeof profId != 'undefined' ? profId : '',
    title: '',
    body: ''
  };

  if (typeof reviewId != 'undefined') { //editing an existing review
    $scope.mode = 'Edit';

    ReviewService.getById(reviewId)
      .success(function (data, status) {
        $scope.review = data.data;
        loadCourseProf();

        if ($scope.review.professor != profId)
          reviewError();
      })
      .error(function (data, status) {
        reviewError();
      });

  }

  function reviewError() {
    $scope.displayText = "The review you're attempting to edit doesn't exist";
    $scope.error = true;
    $scope.showMessage = true;
    $scope.validReview = false;
  }

  if (typeof profId != 'undefined') {
    console.log(profId);
    loadCourses();
  }

  if (typeof courseId != 'undefined') {
    loadProfs();
  }

  function loadCourses() {
    if (typeof profId != 'undefined') {
      ProfessorService.getById(profId)
        .then(function (res) {
          $scope.professor = res.data.data;
          var courseParams = {where: {professors: $scope.professor._id}, select: {'name': 1}};
          return CourseService.get(courseParams);
        }).then(function (res) {
          $scope.courses = res.data.data;
          console.log($scope.courses);

          $scope.professors = [$scope.professor];
          $scope.review.professor = profId;
          $scope.disableProf = true;
          console.log($scope.professors);

        });
    }
  }

  function loadProfs() {
    if (typeof courseId != 'undefined') {
      CourseService.getById(courseId)
        .then(function (res) {
          $scope.course = res.data.data;
          var profParams = {where: {_id: {"$in": $scope.course.professors}}, select: {'name': 1}};
          return ProfessorService.get(profParams);
        }).then(function (res) {
          $scope.professors = res.data.data;
          console.log($scope.professors);

          $scope.courses = [$scope.course];
          $scope.review.course = courseId;
          $scope.disableCourse = true;

        });
    }
  }

  function loadCourseProf() {
    courseId = $scope.review.course;
    profId = $scope.review.professor;

    CourseService.getById(courseId)
      .success(function (data) {
        $scope.courses = [data.data];
        $scope.disableCourse = true;
      });

    ProfessorService.getById(profId)
      .success(function (data) {
        $scope.professors = [data.data];
        $scope.disableProf = true;
      });

  }

  $scope.submit = function () {
    if ($scope.reviewForm.course.$invalid || $scope.reviewForm.rating.$invalid
      || $scope.reviewForm.title.$invalid || $scope.reviewForm.desc.$invalid) {
      $scope.error = true;
    } else {
      var review = $scope.review;
      console.log('here');
      $scope.error = false;

      console.log(review);

      var query;

      if ($scope.mode == 'Add') {
        query = ReviewService.post(review);
      } else {
        query = ReviewService.updateByObj(review);
      }
      query
        .success(function (data, status) {
          $scope.showMessage = true;
          $scope.displayText = data.message;
          $scope.error = false;
        })
        .error(function (data, status) {
          $scope.showMessage = true;
          $scope.displayText = data.message;
          $scope.error = true;
        });
    }
  }

}]);

appControllers.controller('UserReviewController', ['$scope', '$q', '$http', '$routeParams', 'CourseService', 'UserService', 'ReviewService', function ($scope, $q, $http, $routeParams, CourseService, UserService, ReviewService) {

  var userId = $routeParams.userId;

  function load() {
    var params = {where: {user: userId}};
    ReviewService.get(params)
      .success(function (data) {
        $scope.reviews = data.data;

        var courses = [];

        $scope.reviews.forEach(function (obj, i) {
          courses.push(getCourse(obj.course, function (value) {
            $scope.reviews[i].courseName = value.name;
          }));
        });

        $q.all(courses);
      });
  }

  function getCourse(courseId, callback) {
    return CourseService.getById(courseId).success(
      function (value) {
        return callback(value.data);
      }
    );
  }

  $scope.delete = function (reviewId) {
    ReviewService.deleteById(reviewId)
      .success(function () {
        load();
      });
  };
  //TODO: delete associated comments as well

  load();

}]);
