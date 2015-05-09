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
    when('/course/:id/review', {
      templateUrl: 'partials/courseReviewAdd.html',
      controller: 'CourseReviewController'
    }).
    when('/course/:id/review/:reviewId', {
      templateUrl: 'partials/courseReviewAdd.html',
      controller: 'CourseReviewController'
    }).
    when('/professor/:id', {
      templateUrl: 'partials/profDetail.html',
      controller: 'ProfController'
    }).
    when('/professor/:id/review', {
      templateUrl: 'partials/profReviewAdd.html',
      controller: 'ProfReviewController'
    }).
    when('/professor/:id/review/:reviewId', {
      templateUrl: 'partials/profReviewAdd.html',
      controller: 'ProfReviewController'
    }).
    when('/reviews/:userId', {
      templateUrl: 'partials/userReviews.html',
      controller: 'UserReviewController'
    }).
    otherwise({
      redirectTo: '/search'
    });

}]);