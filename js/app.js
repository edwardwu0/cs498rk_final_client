// var demoApp = angular.module('demoApp', ['demoControllers']);

var classApp = angular.module('classApp', ['ngRoute', 'appControllers', 'appServices']);

classApp.config(['$routeProvider', function ($routeProvider) {
  $routeProvider.
    when('/search', {
      templateUrl: 'partials/search.html',
      controller: 'SearchController'
    }).
    when('/course/:id', {
      templateUrl: 'partials/courseDetail.html',
      controller: 'CourseController'
    }).
    when('/review/course/:courseId', {
      templateUrl: 'partials/ReviewAdd.html',
      controller: 'ReviewController'
    }).
    when('/review/edit/:reviewId', {
      templateUrl: 'partials/ReviewAdd.html',
      controller: 'ReviewController'
    }).
    when('/professor/:id', {
      templateUrl: 'partials/profDetail.html',
      controller: 'ProfController'
    }).
    when('/review/professor/:profId', {
      templateUrl: 'partials/ReviewAdd.html',
      controller: 'ReviewController'
    }).
    when('/review/edit/:reviewId', {
      templateUrl: 'partials/ReviewAdd.html',
      controller: 'ReviewController'
    }).
    when('/reviews/:userId', {
      templateUrl: 'partials/userReviews.html',
      controller: 'UserReviewController'
    }).
    otherwise({
      redirectTo: '/search'
    });

}]);