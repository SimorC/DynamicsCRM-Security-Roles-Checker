var CRMHelper = (function (helper) {
    var WebApi = {
        ClientURL: null,
        ExecuteQuery: function (logicalName, select, filter, top, order, expand, flagAsync, successCallback, failCallback) {
            flagAsync = flagAsync !== false;

            var oDataQuery = Internal.createQuery(logicalName, select, filter, top, order, expand);
            var oDataURL = Internal.createURL(oDataQuery);
            var result;

            var req = Internal.createRequest("GET", oDataURL, flagAsync);

            req.onreadystatechange = function () {
                if (this.readyState === 4) {
                    req.onreadystatechange = null;
                    if (this.status === 200 || this.status === 201 || this.status === 304) {
                        var results = JSON.parse(this.response);
                        if (results.value.length > 0) {
                            var extraResult = null;

                            if (results['@odata.nextLink']) {
                                extraResult = Internal.executeNextLink(results['@odata.nextLink']);
                            }

                            result = results.value;

                            if (extraResult) {
                                result.push.apply(result, extraResult);
                            }

                            if (successCallback && typeof successCallback === "function") {
                                successCallback(result);
                            }
                        }
                        else {
                            if (successCallback && typeof successCallback === "function") {
                                successCallback(null);
                            }
                        }
                    } else {
                        if (failCallback && typeof failCallback === 'function') {
                            failCallback(req);
                        }
                    }
                }
            };

            req.send();
            return result;
        },
        RetrieveEntity: function (logicalName, guid, select, expand, async, successCallback, failCallback) {
            expand = expand ? '&$expand=' + expand : '';
            entityName = Internal.getPluralName(logicalName);
            var oDataQuery = '/' + entityName + '(' + guid.replace('{', '').replace('}', '') + ')?$select=' + (select || '*') + expand;
            var oDataURL = Internal.createURL(oDataQuery);
            var result = null;

            var req = Internal.createRequest("GET", oDataURL, async);

            req.onreadystatechange = function () {
                if (this.readyState === 4) {
                    req.onreadystatechange = null;
                    if (this.status === 200 || this.status === 201 || this.status === 304) {
                        var results = JSON.parse(this.response);
                        if (results) {
                            result = results;
                            if (successCallback && typeof (successCallback) === 'function') {
                                successCallback(results);
                            }
                        }
                    } else {
                        if (failCallback && typeof failCallback === 'function') {
                            failCallback(req);
                        }
                    }
                }
            };
            req.send();

            return result;
        },
        GetFormattedValue: function (obj, attribute) {
            var r = "";

            if (obj && obj[attribute]) {
                r = obj[attribute + "@OData.Community.Display.V1.FormattedValue"];
            }

            return r;
        },
        GetEntityMetadataId: function (entityFilterName) {
            var entityName = 'EntityDefinitions';
            var select = 'MetadataId';
            var filter = "LogicalName eq '" + entityFilterName + "'";

            var ret = WebApi.ExecuteQuery(entityName, select, filter, null, null, null, false);

            return ret[0].MetadataId;
        },
        GetEntityOptionSetValues: function (entityMetadataId, lstFieldNames) {
            var query = 'EntityDefinitions(' + entityMetadataId + ')';
            query += '/Attributes/Microsoft.Dynamics.CRM.PicklistAttributeMetadata';
            var select = '?$select=LogicalName';
            var expand = '&$expand=OptionSet,GlobalOptionSet';
            var filter = '';

            for (i in lstFieldNames) {
                filter += filter ? " or LogicalName eq '" + lstFieldNames[i] + "'" : "&$filter=LogicalName eq '" + lstFieldNames[i] + "'";
            }

            var fullURL = Internal.createURL(query + select + expand + filter);

            var req = Internal.createRequest('GET', fullURL, false);
            var result = null;

            req.onreadystatechange = function () {
                if (this.readyState === 4) {
                    req.onreadystatechange = null;
                    if (this.status === 200 || this.status === 201 || this.status === 304) {
                        var results = JSON.parse(this.response);
                        if (results) {
                            result = results;
                        }
                    } else {
                        // Error handler
                    }
                }
            };
            req.send();

            return result;
        }
    };

    var Internal = {
        createRequest: function (method, url, flagAsync) {
            var req = new XMLHttpRequest();
            req.open(method, url, flagAsync);
            req.setRequestHeader("OData-MaxVersion", "4.0");
            req.setRequestHeader("OData-Version", "4.0");
            req.setRequestHeader("Accept", "application/json");
            req.setRequestHeader("Content-Type", "application/json; charset=utf-8");
            req.setRequestHeader("Prefer", "odata.include-annotations=\"*\"");

            return req;
        },
        createQuery: function (entityName, select, filter, top, order, expand) {
            var finalEntityName = entityName == 'EntityDefinitions' ? 'EntityDefinitions' : Internal.getPluralName(entityName);

            var query = '';
            query += finalEntityName;
            query += '?$select=' + (select || '*');
            query += filter ? '&$filter=' + filter : '';
            query += top ? '&$top=' + top : '';
            query += order ? '&$orderby=' + order : '';
            query += expand ? '&$expand=' + expand : '';

            return query;
        },
        createURL: function (oDataQuery) {
            var serverUrl = WebApi.ClientURL ? WebApi.ClientURL : Xrm.Page.context.getClientUrl();
            WebApi.ClientURL = null;

            var oDataURL = serverUrl + "/api/data/v8.1/" + oDataQuery;

            return oDataURL;
        },
        getPluralName: function (logicalName) {
            var query = "/EntityDefinitions?$select=EntitySetName,LogicalName&$filter=LogicalName eq '" + logicalName + "'";
            var oDataURL = Internal.createURL(query);
            var result;

            var req = Internal.createRequest("GET", oDataURL, false);

            req.onreadystatechange = function () {
                if (this.readyState === 4) {
                    req.onreadystatechange = null;
                    if (this.status === 200 || this.status === 201) {
                        var results = JSON.parse(this.response);
                        if (results) {
                            result = results.value[0].EntitySetName;
                        }
                    } else {
                        // Error handler
                    }
                }
            };
            req.send();

            return result;
        },
        checkEmptyObject: function (obj, callback) {
            for (var x in obj) {
                if (typeof obj[x] !== 'undefined') {
                    return false;
                }
            }

            if (callback && typeof callback === 'function') {
                callback();
            }

            return true;
        },
        executeNextLink: function (url) {
            var req = Internal.createRequest("GET", url, false);
            var result;

            req.onreadystatechange = function () {
                if (this.readyState === 4) {
                    req.onreadystatechange = null;
                    if (this.status === 200 || this.status === 201 || this.status === 304) {
                        var results = JSON.parse(this.response);
                        if (results.value.length > 0) {
                            var extraResult = null;

                            if (results['@odata.nextLink']) {
                                extraResult = Internal.executeNextLink(results['@odata.nextLink']);
                            }

                            result = results.value;

                            if (extraResult) {
                                result.push.apply(result, extraResult);
                            }
                        }
                    }
                }
            };

            req.send();
            return result;
        }
    }

    helper.Data = {
        WebAPI: WebApi
    };
    return helper;

}(CRMHelper || {}));