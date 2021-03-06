/*
 * Licensed to Apereo under one or more contributor license
 * agreements. See the NOTICE file distributed with this work
 * for additional information regarding copyright ownership.
 * Apereo licenses this file to you under the Apache License,
 * Version 2.0 (the "License"); you may not use this file
 * except in compliance with the License.  You may obtain a
 * copy of the License at the following location:
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
'use strict';

define(['angular', 'jquery'], function(angular, $) {
    return angular.module('portal.timeout.services', [])
    /**
    Shibboleth Service

    Public Methods
    * getSession() - Gets the shib session from SERVICE_LOC.shibbolethSessionURL
    * getTimeout() - Gets the shib session, but returns just the timeout
                     and the time of that timeout.
    **/
    .factory('portalShibbolethService', ['$http', '$log',
      'miscService', 'SERVICE_LOC',
        function($http, $log, miscService, SERVICE_LOC) {
          var onError = function(response) {
            // do not redirect on failure of the Shibboleth session request,
            // as this normally fails on public.my sites
            // miscService.redirectUser(response.status, 'Shibboleth Service');
            return response.data;
          };

          var onGetSessionSuccess = function(response) {
            return response.data;
          };

          var onGetTimeoutSuccess = function(session) {
            if (session && angular.isObject(session)) {
              var timeout = {};
              timeout.expirationMinutes = session.expiration;
              var now = new Date();
              timeout.expirationTime =
                now.setMinutes(now.getMinutes() + session.expiration);
              timeout.expirationMills = session.expiration * 60000;
              return timeout;
            } else {
              return null;
            }
          };

          /**
           * Retrieves the session from shibboleth
           * @return {*|Function|any|Promise}
           */
          function getSession() {
            return $http.get(SERVICE_LOC.shibbolethSessionURL, {cache: true})
                        .then(onGetSessionSuccess, onError);
          }

          /**
           * Retrieves the timeout for the current session
           * from shibboleth
           * @return {*}
           */
          function getTimeout() {
            return getSession().then(onGetTimeoutSuccess);
          }

          /**
           * Checks whether the shibboleth endpoint is configured
           * @return {boolean}
           */
          function shibServiceActivated() {
            return SERVICE_LOC.shibbolethSessionURL ? true : false;
          }

          /**
           * Gets the user's shibboleth attributes
           * @return {*} An array of Shib attribute objects
           */
          function getUserAttributes() {
            return $http.get(SERVICE_LOC.shibbolethSessionURL, {cache: true})
              .then(function(result) {
                if (result.data) {
                  return result.data.attributes;
                } else {
                  return result;
                }
              })
              .catch(function(error) {
                $log.warn('Failed to get Shibboleth session info');
                $log.error(error);
                miscService.redirectUser(error.status, 'Get User Info');
              });
          }

          return {
            getSession: getSession,
            getTimeout: getTimeout,
            shibServiceActivated: shibServiceActivated,
            getUserAttributes: getUserAttributes,
          };
        }])

    .factory('sessionInactivityService', ['$log', function($log) {
      var lastActivity = Date.now();

      /**
       * update the last activity time
       */
      function onActivity() {
        lastActivity = Date.now();
      }

      /**
       * retrieve the last activity time
       */
      function getLastActivity() {
        return lastActivity;
      }

      /**
       * get the amount of time the user has been inactive
       */
      function getInactiveDuration() {
        return Date.now() - getLastActivity();
      }

      return {
        getLastActivity: getLastActivity,
        getInactiveDuration: getInactiveDuration,
        signalActivity: onActivity,
      };
    }])

    .factory('httpActivityInterceptor', ['sessionInactivityService',
      function(sessionInactivityService) {
      return {
        'response': function(response) {
          sessionInactivityService.signalActivity();
          return response;
        },
      };
    }])

    .config(['$httpProvider', function($httpProvider) {
      $httpProvider.interceptors.push('httpActivityInterceptor');
    }]);
});
