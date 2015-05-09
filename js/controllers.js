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

appControllers.controller('CourseController', ['$scope', '$q', '$http', '$routeParams', 'CourseService', 'ProfessorService', 'ReviewService', 'CommentService', function ($scope, $q, $http, $routeParams, CourseService, ProfessorService, ReviewService, CommentService) {
  var id = $routeParams.id;
  var currentUser = '554d8c2b2edcce772e01e895'; //TODO: for authentication

  $scope.topProfs = [];

  CourseService.getById(id) //Get info for the current course
    .then(function (res) {
      $scope.course = res.data.data;
      $scope.message = res.data.message;
      $scope.status = res.data.status;
      var reviewParams = {where: {course: id}};
      return ReviewService.get(reviewParams);
    }, function (res) {
      console.log('ERROR');
      $q.reject();
    })
    .then(function (res) { //get reviews associated with course
      $scope.reviews = res.data.data;
      $scope.ratingAverage = 0;
      for (var i = 0; i < $scope.reviews.length; i++) {
        $scope.ratingAverage += $scope.reviews[i].rating;
      }
      $scope.ratingAverage /= $scope.reviews.length;

      for (i = 0; i < $scope.course.professors.length; i++) {
        var profId = $scope.course.professors[i];
        var params = {where: {professor: profId, course: id}};
        var average = 0;
        ReviewService.get(params)
          .then(function (res) {
            var reviews = res.data.data;
            for (var j = 0; j < reviews.length; j++) {
              average += reviews[j].rating;
            }

            average /= reviews.length;

            return ProfessorService.getById(profId);
          })
          .then(function (res) {
            var name = res.data.data.name;
            $scope.topProfs.push({name: name, rating: average});
          });
      }

      $scope.getVotes();
    });

  $scope.getReviews = function () {
    var params = {where: {course: id}};
    ReviewService.get(params)
      .then(function (res) {
        $scope.reviews = res.data.data;
        $scope.getVotes();

      });
  };

  $scope.getVotes = function () {
    for (var i = 0; i < $scope.reviews.length; i++) {
      $scope.reviews[i].votes = $scope.reviews[i].upvotes.length - $scope.reviews[i].downvotes.length
    }
  };

  $scope.updateReview = function (index) {
    ReviewService.updateByObj($scope.reviews[index])
      .success(function (data) {
        $scope.getReviews();
      });
  };

  $scope.upvote = function (index) {
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

    $scope.updateReview(index);
    $scope.getVotes();

  };

  $scope.downvote = function (index) {
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

    $scope.updateReview(index);
    $scope.getVotes();
  };

  function loadComments() {
    for (var i = 0; i < $scope.reviews.length; i++) {
      var reviewId = $scope.reviews[i]._id;
      var params = {where: {review: reviewId}, sort: {dateCreated: 1}};
      CommentService.get(params)
        .success(function (data) {
          $scope.comments[reviewId] = data.data;
        });
    }
  }

}]);

appControllers.controller('CourseReviewController', ['$scope', '$location', '$http', '$routeParams', 'CourseService', 'ProfessorService', 'ReviewService', function ($scope, $location, $http, $routeParams, CourseService, ProfessorService, ReviewService) {
  var courseId = $routeParams.id;
  var reviewId = $routeParams.reviewId;

  $scope.mode = 'Add';
  $scope.displayText = '';
  $scope.showMessage = false;
  $scope.error = false;
  $scope.validReview = true;

  $scope.review = {
    user: '554d8c2b2edcce772e01e895', //change once we have authentication
    course: courseId,
    rating: '',
    professor: '',
    title: '',
    body: ''
  };

  if (typeof reviewId != 'undefined') { //editing an existing review
    $scope.mode = 'Edit';

    ReviewService.getById(reviewId)
      .success(function (data, status) {
        $scope.review = data.data;
      })
      .error(function (data, status) {
        $scope.displayText = "The review you're attempting to edit doesn't exist";
        $scope.error = true;
        $scope.showMessage = true;
        $scope.validReview = false;
      });

  }

  CourseService.getById(courseId)
    .then(function (res) {
      $scope.course = res.data.data;
      $scope.message = res.data.message;
      $scope.status = res.data.status;
      var profParams = {where: {_id: {"$in": $scope.course.professors}}, select: {'name': 1}};
      return ProfessorService.get(profParams);
    }).then(function (res) {
      $scope.professors = res.data.data;
    });


  $scope.submit = function () {
    if ($scope.reviewForm.prof.$invalid || $scope.reviewForm.rating.$invalid
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


appControllers.controller('ProfController', ['$scope', '$q', '$http', '$routeParams', 'CourseService', 'ProfessorService', 'ReviewService', 'CommentService', 'UserService', function ($scope, $q, $http, $routeParams, CourseService, ProfessorService, ReviewService, CommentService, UserService) {
  var id = $routeParams.id;
  var currentUser = '554d8c2b2edcce772e01e895'; //TODO: for authentication

  $scope.topCourses = [];

  ProfessorService.getById(id) //Get info for the current course
    .then(function (res) {
      $scope.prof = res.data.data;
      $scope.message = res.data.message;
      $scope.status = res.data.status;

      var courseParams = {where: {professors: id}};
      return ProfessorService.get(courseParams);
    }, function () {
      $q.reject();
    })
    .then(function (res) {
      $scope.courses = res.data.data;

      var reviewParams = {where: {professor: id}};
      return ReviewService.get(reviewParams);
    }, function () {
      console.log('ERROR');
      $q.reject();
    })
    .then(function (res) { //get reviews associated with course
      $scope.reviews = res.data.data;


      $scope.ratingAverage = 0;
      for (var i = 0; i < $scope.reviews.length; i++) {
        $scope.ratingAverage += $scope.reviews[i].rating;
      }
      $scope.ratingAverage /= $scope.reviews.length;

      for (i in $scope.prof.classes) { //Get an average rating for each course
        var courseId = $scope.prof.classes[i];
        console.log(courseId);
        var params = {where: {professor: id, course: courseId}};
        var average = 0;
        ReviewService.get(params)
          .then(function (res) {
            var reviews = res.data.data;
            for (var j = 0; j < reviews.length; j++) {
              average += reviews[j].rating;
            }

            average /= reviews.length;

            return CourseService.getById(courseId);
          })
          .then(function (res) {
            var name = res.data.data.name;
            console.log(name);
            $scope.topCourses.push({name: name, rating: average});
          });
      }

      $scope.getVotes();
      loadComments();
    });

  $scope.getReviews = function () {
    var params = {where: {professor: id}};
    ReviewService.get(params)
      .then(function (res) {
        $scope.reviews = res.data.data;
        $scope.getVotes();
        loadComments();
      });
  };

  $scope.getVotes = function () {
    for (var i = 0; i < $scope.reviews.length; i++) {
      $scope.reviews[i].votes = $scope.reviews[i].upvotes.length - $scope.reviews[i].downvotes.length
    }
  };

  $scope.updateReview = function (index) {
    ReviewService.updateByObj($scope.reviews[index])
      .success(function (data) {
        console.log(data.data);
        $scope.getReviews();
      });
  };

  $scope.upvote = function (index) {
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

    $scope.updateReview(index);
    $scope.getVotes();

  };

  $scope.downvote = function (index) {
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

    $scope.updateReview(index);
    $scope.getVotes();
  };

  $scope.submitComment = function (reviewId) {
    console.log(reviewId + ': ' + $scope.newComment);
    loadComments();
  };

  function loadComments() {
    console.log('comments');
    console.log($scope.reviews);
    for (var i in $scope.reviews) {
      console.log(i);
      var reviewId = $scope.reviews[i]._id;
      var params = {where: {review: reviewId}};
      CommentService.get(params)
        .success(function (data) {
          $scope.reviews[i].comment_objs = data.data;

          console.log($scope.reviews[i].comment_objs);

          for (var j in $scope.reviews[i].comment_objs) {
            console.log(j);
            console.log($scope.reviews[i].comment_objs[j]);
            UserService.getById($scope.reviews[i].comment_objs[j].user)
              .success(function (data) {
                //$scope.reviews[i].comment_objs[j].name = data.facebookId; //TODO: replace with authentication
                //console.log($scope.reviews[i]);
              });
          }

        });
    }
  }

}]);

appControllers.controller('ReviewController', ['$scope', '$location', '$http', '$routeParams', 'CourseService', 'ProfessorService', 'ReviewService', function ($scope, $location, $http, $routeParams, CourseService, ProfessorService, ReviewService) {
  var profId = $routeParams.profId;
  var courseId = $routeParams.courseId;
  var reviewId = $routeParams.reviewId;

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
      .success(function(data) {
        $scope.courses = [data.data];
        $scope.disableCourse = true;
      });

    ProfessorService.getById(profId)
      .success(function(data) {
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
    )
  }

  $scope.delete = function(reviewId) {
    ReviewService.deleteById(reviewId)
      .success(function() {
        load();
      });
  };

  load();

}]);
