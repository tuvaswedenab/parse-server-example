// Use Parse.Cloud.define to define as many cloud functions as you want.
// For example:
Parse.Cloud.define("hello", function(request, response) {
	//this is a comment just to deploy test
	//just another comment to deploy
	response.success("Hello world!");
});

Parse.Cloud.define("checkAPP", function(request, response){
	response.success(Parse.applicationId)
});

Parse.Cloud.define("UpdateInstallation", function(request, response) {
	// Set up to modify user data
    Parse.Cloud.useMasterKey();
        
    if (!request.params.objectId) { 
        createNewInstallation(request, { 
            success: function(installation) {
                response.success('Successfully updated installation table.');
            }, error: function(installation, error) {
                response.error(error);
            }
        });
    } else {
        var query = new Parse.Query(Parse.Installation);
        query.equalTo("objectId", request.params.objectId);
        query.first({
            success: function(installation) {
                if  (installation) {
                    // The object was found, update it.
                    installation.set("GCMSenderId", request.params.GCMSenderId);
                    installation.set("installationId", request.params.installationId);
                    installation.set("deviceType", request.params.deviceType);
                    installation.set("appName", request.params.appName);
                    installation.set("appIdentifier", request.params.appIdentifier);
                    installation.set("parseVersion", request.params.parseVersion);
                    installation.set("deviceToken", request.params.deviceToken);
                    installation.set("pushType", request.params.pushType);
                    installation.set("timeZone", request.params.timeZone);
                    installation.set("localeIdentifier", request.params.localeIdentifier);
                    installation.set("appVersion", request.params.appVersion);

                    installation.save(null, {
                        success: function(installation) {
                            response.success('Successfully updated installation table.');
                        }, error: function(installation, error) {
                            response.error("Could not save changes to installation.");
                        }
                    });
                } else {
                    createNewInstallation(request, { 
                        success: function(installation) {
                            response.success('Successfully updated installation table.');
                        }, error: function(installation, error) {
                            response.error("Could not save changes to installation.");
                        }
                    });
                }
            }, error: function(error) {
                response.error('query error');
            }
        });
    }
});

var createNewInstallation = function(request, response) {
    Parse.Cloud.useMasterKey();
    var installation = new Parse.Installation();
    installation.set("GCMSenderId", request.params.GCMSenderId);
    installation.set("installationId", request.params.installationId);
    installation.set("deviceType", request.params.deviceType);
    installation.set("appName", request.params.appName);
    installation.set("appIdentifier", request.params.appIdentifier);
    installation.set("parseVersion", request.params.parseVersion);
    installation.set("deviceToken", request.params.deviceToken);
    installation.set("pushType", request.params.pushType);
    installation.set("timeZone", request.params.timeZone);
    installation.set("localeIdentifier", request.params.localeIdentifier);
    installation.set("appVersion", request.params.appVersion);
    installation.save(null, {
        success: function(installation) {
            response.success(installation);
        }, error: function(installation, error) {
            response.error(installation, error);
        }
    });
}

Parse.Cloud.define("changeUserPassword", function(request, response) {
	 	// Set up to modify user data
	 	Parse.Cloud.useMasterKey();
		var query = new Parse.Query(Parse.User);
		query.equalTo("username", request.params.username);  // find all the women
		query.first({
			 success: function(myUser) {
			   // Successfully retrieved the object.
				myUser.set("password", request.params.newPassword);

				myUser.save(null, {
			       success: function(myUser) {
			         // The user was saved successfully.
			         response.success("Successfully updated user.");
			       },
			       error: function(myUser, error) {
			         // The save failed.
			         // error is a Parse.Error with an error code and description.
			         response.error("Could not save changes to user.");
			       }
			     });
			 },
			 error: function(error) {
			   alert("Error: " + error.code + " " + error.message);
			 }
	});
});

// Sends a push notification when a Application is stored 
// ---- SENDS TO THE GROUP ADMIN ----
Parse.Cloud.afterSave("Application", function(request) {
	// Is here to prevent relations to call on update
	if (request.object.existed()) {
		return;
	}

	var application = request.object;
	var query = new Parse.Query(Parse.Object.extend("Group"));

	query.get(application.get('group').id).then(function(group) {
		// The admin of this group will receive a push notification
		var channelName = "user-" + group.get("admin").id;
		// Creates a message string to notify user
		var messageText = "You've got an applicant to " + group.get("name");

		Parse.Push.send({
			channels: [channelName],
			data: {
				alert: messageText,
				badge: "Increment",
				id: application.id,
				sound: "default",
				title: "New applicant!",
				type: "Application"
			}
		}, { useMasterKey: true }).then(function() {
			console.log("APPLICATION -> Push notification sent to channel -> " + channelName);
		}, function(error) {
			throw "Got an error " + error.code + " : " + error.message;
		});
	});
});

// Sends a push notification when a Post is stored 
// ---- SENDS TO OWNER OF POST AND OWNER OF A COMMENT ----
Parse.Cloud.afterSave("Comment", function(request) {
	// Is here to prevent relations to call on update
	if (request.object.existed()) {
		return;
	}

	var comment = request.object;
	var commentCreatorName = "";
	var postCreatorChannel = "";

	var queryCreator = new Parse.Query(Parse.Object.extend("TuvaUser"));
	queryCreator.get(comment.get("creator").id).then(function(user) {
		// Sets the creator name to use as messageText in Push
		commentCreatorName = user.get("firstName") + " " + user.get("lastName");

		var queryPost = new Parse.Query(Parse.Object.extend("Post"));
		// Return the promise and resolve on "then()"
		return queryPost.get(comment.get("post").id);

	// When promise of Post been resolved
	}).then(function(post) {
		
		var queryComments = new Parse.Query(Parse.Object.extend("Comment"));
		// Get all comments related to this post
		queryComments.equalTo("post", post);
		// Get all user comments thats not the creators 
		//queryComments.notEqualTo("creator", comment.get("creator").id);

		// Set the owner of the post's channel
		postCreatorChannel = "user-" + post.get("creator").id;

		// Return the promise and resolve on "then()"
		return queryComments.find();
	
	// When promise of Comments been resolved
	}).then(function(comments) {
		// If comments not empty
		if (comments) {
			var channelNames = [];
			// Channel not to send to (the creator)
			var channelNotToSend = "user-" + comment.get("creator").id;

			// If Post and Comment -creator are not the same, send to Post creator
			if (postCreatorChannel != channelNotToSend) {
				channelNames.push(postCreatorChannel);
			}

			// Foreach comment, add the receiver of push notification exept the creator
			comments.forEach(function(c) {
				var userChannel = "user-" + c.get("creator").id;
				console.log(userChannel);
				// If the channel is not the comment creator's and not already in channel-array
				if (channelNotToSend != userChannel && !(channelNames.indexOf(userChannel) > -1)) {
					channelNames.push(userChannel);
				}
			});

			if (channelNames.length > 0) {

				var messageText = commentCreatorName + " commented on a post you have a connection to.";

				Parse.Push.send({
					channels: channelNames,
					data: {
						alert: messageText,
						badge: "Increment",
						id: comment.id,
						sound: "default",
						title: "New comment on post!",
						type: "Comment"
					}
				}, { useMasterKey: true }).then(function() {
					console.log("COMMENT -> Push notification sent to channels -> ")
					channelNames.forEach(function(channel) {
						console.log("Channel -> " + channel);
					});
				}, function(error) {
				    throw "Got an error " + error.code + " : " + error.message;
				});
			} else {
				console.log("COMMENT -> No channels to send to.");
			}
		} else {
			console.log("COMMENT -> No comments found");
		}
	});

});

Parse.Cloud.afterSave("Invitation", function(request) {
	// Is here to prevent relations to call on update
	if (request.object.existed()) {
		return;
	}

	var invitation = request.object;
	var query = new Parse.Query(Parse.Object.extend("Group"));

	//Get the group of invitation
	query.get(invitation.get("group").id).then(function(group) {
		// The receiver of the push is the guest
		var channelName = "user-" + invitation.get("guest").id;
		// Message string to notify user
		var messageText = "You received an invitation to " + group.get("name");

		Parse.Push.send({
			channels: [channelName],
			data: {
				alert: messageText,
				badge: "Increment",
				id: invitation.id,
				sound: "default",
				title: "New invitation!",
				type: "Invitation"
			}
		}, { useMasterKey: true}).then(function() {
		    console.log("INVITATION -> Push notification sent to channel -> " + channelName)
		}, function(error) {
		    throw "Got an error " + error.code + " : " + error.message;
		});
	});
});

// Sends a push notification when a Post is stored 
// ---- SENDS TO ALL MEMBERS OF THE GROUP ----
Parse.Cloud.afterSave("Post", function(request) {
	// Is here to prevent relations to call on update
	if (request.object.existed()) {
		return;
	}

	var post = request.object;
	var query = new Parse.Query(Parse.Object.extend("TuvaUser"));

	// Get the post's user
	query.get(post.get('creator').id).then(function(user) {
		// Everyone in this group will receiver a push notification
		var channelName = "group-" + post.get('group').id;
		// Message string to notify user
		var messageText = user.get('firstName') + " " + user.get('lastName') + " added a post.";

		Parse.Push.send({
			channels: [channelName],
		    data: {
		      	alert: messageText,
		      	badge: "Increment",
		      	id: post.id,
		      	sound: "default",
		      	title: "New post!",
		      	type: "Post"
		    }
		}, { useMasterKey: true }).then(function() {
		    console.log("POST -> Push notification sent to channel -> " + channelName)
		}, function(error) {
		    throw "Got an error " + error.code + " : " + error.message;
		});
	});
});

/******** THIS IS OUT COMMENTED FOR NOW. AFTERSAVES FROM OTHER TABLES MAY COVER THIS FUNCTION ****/
// Sends a push notification when a NotificationReceiver is stored
// Parse.Cloud.afterSave("NotificationReceiver", function(request) {
// 	var notificationReceiver = request.object;
// 	// Create channel-name with the user id by adding "user-" to user id
// 	var channelName = "user-" + notificationReceiver.get("receiver").id;
// 	// Message string to notify user
// 	var messageText = "You've got a personal message.";

// 	Parse.Push.send({
// 		channels: [channelName],
// 		data: {
// 			alert: messageText,
// 			badge: "Increment",
// 			id: notificationReceiver.id,
// 			sound: "default",
// 			title: "New notification!",
// 			type: "NotificationReceiver"
// 		}
// 	}, { useMasterKey: true }).then(function() {
// 		console.log("NOTIFICATIONRECEIVER -> Push notification sent to channel -> " + channelName);
// 	}, function(error) {
// 		throw "Got an error " + error.code + " : " + error.message;
// 	});
// });
