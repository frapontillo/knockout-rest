Knockout-REST
=============

**Knockout-REST** is a simple library to extend Knockout.js objects with RESTful actions.

### Author
Francesco Pontillo

### Description:
The library implements classes and methods to access a RESTful service,
GET, PUT, POST, DELETE for any resource.
It aims to provide a general extensible framework for RESTful application
consumers.
Every entity:

 * is an **observable**, nested objects as well
 * has a **dirty observable** (if object.person.name changes, object gets dirty)
 * can track its and its children's changes
 * can undo all the changes in the item

### License:
The library is released "as is", without any warranty nor promises.
It is licensed under the MIT license.

## Getting started
Knockout-REST requires three libraries:

 * [knockout-2.1.0.js](http://github.com/SteveSanderson/knockout) (it should work with 2.0.0+), for the whole data-bind sorcery
 * [knockout.mapping-2.1.0.js](http://github.com/SteveSanderson/knockout.mapping), for mapping objects to and from our RESTful Web Service
 * [jQuery](http://jquery.com), uses `$.ajax`
 
## Basic Usage

Knockout-REST is very simple to use.
Let's first create a ViewModel for our page, assuming we want it to contain just a person, for now.

```javascript
	var VM = function () {
		var self = this;
		self.person;
	};
```

Let's now instantiate the view model, and create the person as a **REST Entity**.

```javascript
	var mVM = new VM();
	mVM.person = new ko.pontillo.rest.entity();
```

The `ko.pontillo.rest.entity()` can accept an empty entity object: it will be used as soon as you do something like:

```javascript
	// Creates a new person, ready to be data-bound, if it's not already
	mVM.person.newEntity();
```

## RESTful Actions
Every entity can be bound to a URL.

```javascript
	// GET a person
	mVM.person.Get("api/people/123");
	// PUT (update) a person
	mVM.person.Put("api/people/123");
	// DELETE a person
	mVM.person.Delete("api/people/123");
	// POST (create) a person
	mVM.person.Post("api/people");
```

Entity does not assume anything in regards to the resource URL, so you'll need to pass one every time you make a call to the Web Service.
This default behavior can be overridden by extending the Entity and creating a custom class that handles URLs by itself.

Every RESTful Action on entities accepts a success callback. An error callback will be implemented in the future.

## Change tracking
All entities have a few observables tracking the state of the entity itself.

 * `isUpdating` checks if an entity is currently being updated from the server.
 * `isLoaded` checks if an entity is loaded.
 * `isGot` is true when an entity was got from the server, false otherwise.
 * `isError` checks for an error state for an entity. Every error from the REST service sets the entity's `isError` to true.
 * `hasChanged` is true when the entity was changed and the changes are not yet committed to the Web Service.
 
## Undo changes
If you want to restore an entity without having to reload it from the Web Service, you can do so.

```javascript
	// First checks if the entity has changed
	// (optional, the check is made by the undo method)
	if (mVM.person.hasChanged()) {
		// Undo all changes to the person
		mVM.person.undo();
	}
```

## A simple example

```javascript
	// The ViewModel class
	var VM = function () {
		var self = this;
		self.person;
	};
	
	// Create a new ViewModel object
	var mVM = new VM();
	
	// Instantiate a person as a REST entity
	mVM.person = new ko.pontillo.rest.entity();
	
	// Get the person
	mVM.person.Get("api/people/123");
	
	// Click binding to the save button
	$("button#save").click(function() {
		// First checks if the entity has changed
		if (mVM.person.hasChanged()) {
			// PUT (update) the person
			mVM.person.Put("api/people/123");
		}
	});
	
	// Click binding to the delete button
	$("button#delete").click(function() {
		// DELETE a person
		mVM.person.Delete("api/people/123");
	});
	
	// Click binding to the undo button
	$("button#undo").click(function() {
		// Undo all changes to the person
		mVM.person.undo();
	});
	
	// Apply the knockout bindings
	ko.applyBindings(mVM);
```
```html
	<div data-bind="if: person().isLoaded()">
		<input type="text" data-bind="value: person().firstname" />
		<input type="text" data-bind="value: person().lastname" />
		<input type="button" id="save" />
		<input type="button" id="delete" />
		<input type="button" id="undo" />
	</div>
```