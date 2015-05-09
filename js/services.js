// js/services/todos.js
var baseUrl = 'http://localhost:4000';
angular.module('appServices', [])
  .factory('UserService', function ($http) {
    return restFunctions($http, 'users');
  })
  .factory('CourseService', function ($http) {
    return restFunctions($http, 'courses');
  })
  .factory('ProfessorService', function ($http) {
    return restFunctions($http, 'professors');
  })
  .factory('ReviewService', function ($http) {
    return restFunctions($http, 'reviews');
  })
  .factory('CommentService', function ($http) {
    return restFunctions($http, 'comments');
  })
  .factory('AuthService', function ($http) {
    return {
      getUser: function() {
        return '554d8c2b2edcce772e01e895'; //TODO: add authentication
      }
    }
  })

;

function restFunctions($http, endPoint) {
  return {
    get: function (p) {
      return $http.get(baseUrl + '/api/' + endPoint, {params: p});
    },
    getById: function(id) {
      return $http.get(baseUrl + '/api/'+ endPoint +'/' + id);
    },
    post: function(obj) {
      console.log(obj);
      return $http({
        method: 'POST',
        url: baseUrl + '/api/'+ endPoint +'/',
        data: $.param(obj),
        headers: {'Content-Type': 'application/x-www-form-urlencoded'}
      });
      //return $http.post(baseUrl + '/api/'+ endPoint +'/', obj);
    },
    updateByObj: function(obj) {
      console.log(obj);
      return $http({
        method: 'PUT',
        url: baseUrl + '/api/'+ endPoint +'/' + obj._id,
        data: $.param(obj),
        headers: {'Content-Type': 'application/x-www-form-urlencoded'}
      });
    }
  }
}
