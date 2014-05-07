/*
Extension library for Knockout.js
----------------------------------------------------------------------------------------------------------
Author:
    Francesco Pontillo
Description:
    The library implements classes and methods to access a RESTful service,
    GET, PUT, POST, DELETE for any resource.
    It aims to provide a general extensible framework for RESTful application
    consumers.
    Every entity:
    - is an observable, nested objects as well
    - has a dirty observable (if object.person.name changes, object gets dirty)
    - can track its and its children's changes by adding a tracker
    - can undo all the changes in the item
Uses:
    This library requires:
    - knockout-2.1.0.js (it should work with 2.0.0+)
    - knockout.mapping-2.1.0.js
    - jquery-1.5 or greater
License (MIT):
	Copyright (c) 2012 Francesco Pontillo
	Permission is hereby granted, free of charge, to any person obtaining a
	copy of this software and associated documentation files (the "Software"),
	to deal in the Software without restriction, including without limitation
	the rights to use, copy, modify, merge, publish, distribute, sublicense,
	and/or sell copies of the Software, and to permit persons to whom the
	Software is furnished to do so, subject to the following conditions:
	The above copyright notice and this permission notice shall be included
	in all copies or substantial portions of the Software.
	THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
	OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
	FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL
	THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
	LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
	OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
	THE SOFTWARE.
*/

// Base namespace
ko.pontillo = function () { };
// Rest namespace
ko.pontillo.rest = function () { };

// Utils class
ko.pontillo.rest.utils = new function () {
    var self = this;
    // Sets an entity from a JSON string
    self.setFromJSON = function (object, JSON) {
        self.setFromJS(object, ko.mapping.fromJSON(JSON));
    };
    // Sets an entity from a regular JS object
    self.setFromJS = function (object, JS) {
        // Set the new data
        var d = ko.mapping.fromJS(JS);
        // Set as observable
        if (object === undefined)
            object = ko.observable();
        // Makes every object into an observable
        if (!ko.isObservable(d)) d = ko.observable(d);
        ko.pontillo.rest.utils.makeAllObservables(d);
        object(ko.isObservable(d) ? d() : d);
    };
    // Serializes an object to a JSON string
    self.toJSON = function (object) {
        return ko.mapping.toJSON(object);
    };
    // Makes an observable's children observables on every level
    self.makeAllObservables = function (observable) {
        // Loop through its children
        for (var child in observable()) {
            // If this child is not an observable and is an object
            if ((!ko.isObservable(observable()[child])) && (typeof observable()[child] === "object")) {
                // Make it an observable
                observable()[child] = ko.observable(observable()[child]);
                // Make all of its children observables
                self.makeAllObservables(observable()[child]);
            }
        }
    };
}

/*
 *  Entity class, useful to map a REST object.
 *  When initalizing, pass an empty data model, it will be used to create new instances.
 */
ko.pontillo.rest.entity = function (dataModel) {
    // The main object
    var self = this;
    var newDataModel = dataModel;
    // Setting what to ignore
    ko.mapping.defaultOptions().ignore = ["isUpdating", "isLoaded", "isGot", "isError", "__ko_mapping__"];

    var item = ko.observable(ko.mapping.fromJS({}));

    // A few status observables
    item.isUpdating = ko.observable(false);
    item.isLoaded = ko.observable(false);
    item.isGot = ko.observable(false);
    item.isError = ko.observable(false);

    item.newEntity = function () {
        // Set the new data
        item.setData(newDataModel || {});
        item.isLoaded(false);
    };

    // A method for attaching a metadata object to any object
    item.setTracker = function (object) {
        // Create the metadata
        var tracker = {};
        tracker.parent = object;
        tracker.oldValue = ko.mapping.toJSON(object);
        tracker.newValue = ko.mapping.toJSON(object);
        tracker.changed = true;
        // Attach the metadata to the object
        object._tracker = tracker;
        // TODO: does not work, if nothing changes the hasChanged computed is not fired off
        tracker.clean = function () {
            var me = object._tracker;
            me.changed = false;
            me.hasChanged(false);
        };
        // Checks for changing in the model
        tracker.checkChanged = function () {
            var me = object._tracker;
            this.newValue = ko.mapping.toJSON(object);
            var res = ((this.newValue != this.oldValue) && (this.oldValue != undefined) && this.changed);
            if (res == true) this.changed == true;
            return res;
        };
        // Computed Observable, returns the value of checkChanged and tracks all the changes in the entity
        tracker.hasChanged = new ko.computed({
            read: function () {
                var me = object._tracker;
                console.log("Something has changed");
                return me.checkChanged();
            },
            write: function (value) {
                return value;
            },
            owner: object
        }, object);
        // Undoes all the changes in the model
        tracker.undo = function () {
            var me = object._tracker;
            if (me.newValue != me.oldValue) {
                me.newValue = me.oldValue;
                ko.pontillo.rest.utils.setFromJSON(object, me.oldValue);
            }
        };
        // Add a couple of utility functions to the observable object
        object.hasChanged = new ko.computed(function () {
            return object._tracker.checkChanged();
        });
        object.undo = function () {
            return object._tracker.undo();
        };

        // TODO for debugging: shows the current metadata to see what changetracker fired off the event
        console.log(tracker);
    };

    // Updates the observable object (self) that contains the real data
    item.setData = function (data) {
        // Set the new data
        ko.pontillo.rest.utils.setFromJS(item, data);
        // Add some metadata to track and restore
        item.setTracker(item);
        // Sets the content as loaded
        item.isLoaded(true);
    };

    // Gets the representation of the current resource as JSON
    item.toJSON = function () {
        return ko.pontillo.rest.utils.toJSON(item);
    };

    // The GET method, reads an element from an URL and updates the model
    item.Get = function (url, callback) {
        return $.ajax({
            type: 'GET',
            url: url,
            beforeSend: function () {
                item.isUpdating(true);
                console.log("Getting resource at " + url + " ...");
            },
            statusCode: {
                200: function (data, textStatus, jqXHR) {
                    // Update the data
                    item.setData(data);
                    item.isGot(true);
                    item.isError(false);
                    console.log("Got the resource at " + url + " .");
                    if (callback) callback();
                },
                304: function () {
                }
            },
            error: function (jqXHR, textStatus, errorThrown) {
                item.isError(true);
                console.log("Error while getting the resource at " + url + " .");
            }
        }).always(function () {
       	    item.isUpdating(false);
        });
    };

    // The POST method, adds an element to an URL and updates the model
    item.Post = function (url, callback) {
        return $.ajax({
            type: "POST",
            url: url,
            contentType: "application/json",
            dataType: "json",
            data: item.toJSON(),
            beforeSend: function () {
                item.isUpdating(true);
                console.log("Posting resource at " + url + " ...");
            },
            statusCode: {
                201: function (data, textStatus, jqXHR) {
                    // Update the data
                    item.setData(data);
                    item.isGot(true);
                    item.isError(false);
                    console.log("Posted the resource at " + url + " .");
                    if (callback) callback();
                },
                304: function () {
                }
            },
            error: function (jqXHR, textStatus, errorThrown) {
                item.isError(true);
                console.log("Error while posting the resource at " + url + " .");
            }
        }).always(function () {
       	    item.isUpdating(false);
        });
    };

    // The PUT method, updates an element to an URL and updates the model
    item.Put = function (url, callback) {
        return $.ajax({
            type: "PUT",
            url: url,
            contentType: "application/json",
            dataType: "json",
            data: item.toJSON(),
            beforeSend: function () {
                item.isUpdating(true);
                console.log("Putting resource at " + url + " ...");
            },
            statusCode: {
                201: function (data, textStatus, jqXHR) {
                    // Update the data
                    item.setData(data);
                    item.isGot(true);
                    item.isError(false);
                    console.log("Put the resource at " + url + " .");
                    if (callback) callback();
                },
                304: function () {
                }
            },
            error: function (jqXHR, textStatus, errorThrown) {
                item.isError(true);
                console.log("Error while putting the resource at " + url + " .");
            }
        }).always(function () {
       	    item.isUpdating(false);
        });
    };

    // The DELETE method, deletes an element from an URL
    item.Delete = function (url, callback) {
        return $.ajax({
            type: "DELETE",
            url: url,
            contentType: "application/json",
            dataType: "json",
            beforeSend: function () {
                item.isUpdating(true);
                console.log("Deleting resource at " + url + " ...");
            },
            success: function (data, textStatus, jqXHR) {
                // Update the data
                item.setData(data);
                item.isGot(true);
                item.isError(false);
                console.log("Deleted the resource at " + url + " .");
                if (callback) callback();
            },
            error: function (jqXHR, textStatus, errorThrown) {
                item.isError(true);
                console.log("Error while deleting the resource at " + url + " .");
            }
        }).always(function () {
       	    item.isUpdating(false);
        });
    };

    // TODO
    // The HEAD method, retrieves the available methods on the URL

    /* ---------------------------------------------------------------------------------- */

    return item;
};
