var express = require('express');
var router = express.Router();
var crypto = require('crypto');
var nodemailer = require('nodemailer');
//this is used for generating SVG Captchas
var svgCaptcha = require('svg-captcha');

//importing passport and its local strategy
var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
//var LocalStrategy = require('passport-local').Strategy;

//here we import the User model
var User  = require('../models/User');
var Order = require('../models/Orders');
var Issue = require('../models/Issues');
var Quote = require('../models/Quotations');


//These are all the get requests

/* GET home page. */
router.get('/', isAuthenticated, function(req, res, next){
	Quote.getAllQuotesForSupplier(function(err, quotes){
		res.render('users', {
			quotes:quotes
		})
	})
});

//for login page
router.get('/login', function(req, res, next){
	//here we generate captcha
	var captcha = svgCaptcha.create();
	//now we store the captcha text in req.session object
	// for later verification on POST
	req.session.captcha = captcha.text;

	//we send along the captcha SVG(image) in the captcha variable
	res.render('login2',{
		captcha:captcha.data
	});
});




//Passport serializing and deserializing user from a session
passport.serializeUser(function(user, done) {
	//console.log('user serialized');
	done(null, user.id);
});

passport.deserializeUser(function(id, done) {
	User.findOneById(id, function(err, user) {
		done(err, user);
	});
});



//creating passport local strategy for login with email and password
passport.use(new LocalStrategy(
	function (username, password, done) {
		console.log('local st called')
		User.findByUsername(username, function (err, user) {
			if(err){
				return done(err);
			}
			if(!user){
				console.log("user with username : " + username + " not found");
				done(null, false, {usermsg:"user with this username does not exist"});
			}
			User.comparePassword(password, user.password, function (err, isMatch) {
				if(err)throw err;
				if(!isMatch){
					return done(null, false, {passmsg:"Password is incorrect"});
				}
				return done(null, user);
			});

		})
	}
));






//These are all the POST requests

//POST for login
//this takes username, password and captcha
router.post('/login', function(req, res, next){

	//extracting all the info from request parameters
	var username = req.body.username;
	var password = req.body.password;
	var captcha = req.body.captcha;

	//checking all the form-data is right
	req.checkBody('username', 'please enter a valid username').isEmail();
	req.checkBody('password', 'please enter a valid password').notEmpty();
	req.checkBody('captcha', 'Captcha is incorrect').equals(req.session.captcha);

	console.log(req.body);
	//getting all the validation errors
	var errors = req.validationErrors();
	if(errors){
		res.send(errors)
	}else{
		console.log('else called');
		console.log(username, password);
		//checking the user credentials for loggin him in with session
		passport.authenticate('local', function (err, user, info) {

			//this function is called when LocalStrategy returns done function with parameters

			//if any error , throw error to default error handler
			if(err) throw err;

			//if username or password doesn't match
			if(!user){
				return res.send({msg:info});
			}

			//this is when login is successful
			req.logIn(user, function(err) {
				if (err) { return next(err); }
				return res.redirect('/');
			});
			
		})(req,res,next);
	}
});


//this route is for creating new user
router.post('/signup', function(req, res, next){
	var name = req.body.name;
	var email = req.body.email;
	var contact = req.body.contact;
	var pan = req.body.pan;
	var gstin = req.body.gstin;
	var password = req.body.password;
	var password2 = req.body.password2;
	var userType = 'supplier';

	console.log(req.body.name);
	console.log(name);

	req.checkBody('name', 'Name cannot be empty').notEmpty();
	req.checkBody('email', 'Email cannot be empty').notEmpty();
	req.checkBody('contact', 'contact cannot be empty').notEmpty();
	req.checkBody('pan', 'Pan cannot be empty').notEmpty();
	req.checkBody('gstin', 'GSTIN cannot be empty').notEmpty();
	req.checkBody('email', "Enter a valid email").isEmail();
	req.checkBody('password', 'password cannot be empty').notEmpty();
	req.checkBody('password2', 'confirm password cannot be empty').notEmpty();
	req.checkBody('password', 'Passwords do not match').equals(password2);

	var errors = req.validationErrors();
	console.log(errors);

	if(errors){
		//console.log(errors);
		res.send(errors);
	}else{
		console.log('else block called');
		var newUser = new User({
			name:name,
			email:email,
			contact:contact,
			pan:pan,
			gstin:gstin,
			password:password,
			userType:userType
		});

		User.createUser(newUser, function (err, user) {
			if(err){
				res.send('some error occured');
				throw err;
			}else{
				console.log(user);
				res.send('user created');
			}
		})
	}
});


//not used
//this route is used to add a customer site
router.post('/addsite', function(req, res){
	var name = req.body.name;
	var lat = req.body.lat;
	var long = req.body.long;
	var address = req.body.address;

	req.checkBody('name', 'Name cannot be empty').notEmpty();
	req.checkBody('lat', 'lat cannot be empty').notEmpty();
	req.checkBody('long', 'long cannot be empty').notEmpty();
	req.checkBody('address', 'address cannot be empty').notEmpty();

	var errors = req.validationErrors();
	console.log(errors);

	if(errors){
		//console.log(errors);
		res.send(errors);
	}else{
		console.log('else block called');
		var customerSite = {
			name:name,
			lat:lat,
			long:long,
			address:address
		};
		console.log(customerSite);

		User.addSite(customerSite, req.user._id, function (err, user) {
			if(err){
				res.send('some error occured');
				throw err;
			}else{
				console.log(user);
				res.send('site added');
			}
		})
	}
})


//not used
//this route deletes site from the site array in user document
router.post('/deletesite', function(req, res){
	//change this to pick userid from req header and site id  from req.body
	User.removeSite(req.body.userid, req.body.siteid, function(err, site){
		if(err)throw err;
		res.send(site);
	})
})



//this route returns the profile info of the current logged in user
router.get('/profile', function(req,res){
	User.findOneById(req.user._id, function(err, user){
		if(err)throw err;
		res.send(user);
	})
});

//this route is called as POST when profile change is required
router.post('/profile', function(req, res){
	var id = req.body.id;
	var name = req.body.name;
	var email = req.body.email;
	var contact = req.body.contact;
	var pan = req.body.pan;
	var gstin = req.body.gstin;
	var customerSite = req.body.customerSite;

	console.log(req.body.name);
	console.log(name);

	req.checkBody('id', 'id cannot be empty').notEmpty();
	req.checkBody('name', 'Name cannot be empty').notEmpty();
	req.checkBody('email', 'Email cannot be empty').notEmpty();
	req.checkBody('contact', 'contact cannot be empty').notEmpty();
	req.checkBody('pan', 'Pan cannot be empty').notEmpty();
	req.checkBody('gstin', 'GSTIN cannot be empty').notEmpty();
	req.checkBody('customerSite', 'Site cannot be empty').notEmpty();
	req.checkBody('email', "Enter a valid email").isEmail();
	
	var errors = req.validationErrors();
	console.log(errors);

	if(errors){
		//console.log(errors);
		res.send(errors);
	}else{
		User.findOneById(id, function(err, user){
			if(err)throw err;
			user.name = name;
			user.email = email;
			user.contact = contact;
			user.pan = pan;
			user.gstin = gstin;
			user.customerSite = customerSite;

			User.updateUser(id, user, function(err){
				if(err)throw err;
				res.send("update user successful" + user);
			})
		})
	}
})



//this route returns all the order(cancelled as well as successful)
router.get('/history', function(req, res){
	Order.getAllOrderdBySupplierId(req.user._id, function(err, orders){
		res.send(orders);
	})
});



//this is post for forgot password which requires user's email id
router.post('/forgot', function(req, res){
	var email = req.body.email;
	
	User.findOneByEmail(email, function(err, user){
		if(err)throw err;
		if(!user){
			res.send("no user with this username exists");
		}
		crypto.randomBytes(20, function(err, buf){
			if(err)throw err;
			var token = buf.toString('hex');
			user.resetPasswordToken = token;
			user.resetPasswordExpire = Date.now() + 3600000; //1hour

			user.save(function(err){
				if(err)throw err;
			});

			var smtpTransport = nodemailer.createTransport({
				service:'SendGrid',
				auth:{
					user:'jarvis123',
					pass:'abhansh@123'
				}
			});
			var mailOptions = {
				to:user.email,
				from:'passwordreset@demo.com',
				subject:'concrete password reset',
				text:'You are receiving this because you (or someone else) have requested the reset of the password for your account.\n\n' +
				'Please click on the following link, or paste this into your browser to complete the process:\n\n' +
				'http://' + req.headers.host + '/reset/' + token + '\n\n' +
				'If you did not request this, please ignore this email and your password will remain unchanged.\n'
			};
			smtpTransport.sendMail(mailOptions, function(err){
				res.send("a mail has been sent to your registered mail id");
			})
		})
	})
});

//this route will verify the password token hasn't expire and returns a json response
router.get('/reset/:token', function(req, res) {
	User.findOneForResetPassword(req.params.token, function(err, user) {
	  if (!user) {
		  var result = {
			  err:true,
			  msg:'Password reset token is invalid or has expired.'
		  }
		return res.status(200).json(result);
	  }
	  var result = {
		  msg:"reset your password", 
		  user:user
	  }
	  res.status(200).json(result);
	});
});

//POST for password reset and if token hasn't expired, the password of user is reset.
router.post('/reset/:token', function(req, res){
	User.findOneForResetPassword(req.params.token, function(err, user){
		if(err)throw err;
		if(!user){
			var result = {
				msg:"this token has expired"
			}
			return res.status(200).json(result);
		}
		user.password = req.body.password;
		user.resetPasswordExpire = undefined;
		user.resetPasswordToken = undefined;

		User.saveUserResetPassword(user, function(err){
			if(err)throw err;
			req.logIn(user, function(err){
				res.status(200).json("password has been reset successfully");
			});
		});
	});
});


//this api will show all the requested quotes to the supplier with 
//the ones he has already responded to
router.get('/getquotes', function(req, res){
	Quote.getAllQuotesForSupplier(function(err, quotes){
		if(err)throw err;
		res.send(quotes);
	});
});


//this will record the suppliers response to quotes
router.post('/respondtoquote', function(req, res){
	var rmxId = req.body.rmxId;
	var price = req.body.price;
	var validTill = req.body.validTill;
	var quoteId = req.body.quoteId;

	var response = {
		rmxId:rmxId,
		price:price,
		validTill:validTill
	}
	console.log(response);
	Quote.respondToQuote(quoteId, response, function(err, quote){
		if(err)throw err;
		console.log(quote);
		res.send('respond to quote submitted' + quote);
	})
});


//this api will remove a quote response that a supplier submitted earlier
router.post('/removequote', function(req, res){
	var quoteId = req.body.quoteId;
	var responseId = req.body.responseId;
	Quote.deleteResponse(quoteId, responseId, function(err, quote){
		if(err)throw err;
		console.log(quote);
		res.send('reponse deleted');
	});
});


//this api will show all the orders that are pending confirmation from seller
router.get('/pendingorders', function(req, res){
	Order.getOrdersForResponse(function(err, orders){
		if(err)throw err;
		res.send(orders);
	});
});



//this api will confirm the order from seller and add description from the seller about the order
router.post('/pendingorders', function(req, res){
	var status = 'approved';
	var statusDate = Date.now();
	var statusDesc = req.body.statusDesc || 'The supplier has confirmed to deliver your order';
	var orderId = req.body.orderId;

	Order.updatePendingOrder(orderId, status, statusDesc, statusDate, function(err, order){
		if(err)throw err;
		res.send(order);
	});
});




//not using this
//API to add an Order
router.post('/addorder', function(req, res, next){
	var quantity = req.body.quantity;
	var quality = req.body.quality;
	var requestedBy = req.body.requestedBy;
	var date = new Date();
	var requestedById = req.body.requestedById;
	var status = 'ongoing';

	console.log(req.body.quantity);
	console.log(quantity);

	req.checkBody('quantity', 'quantity cannot be empty').notEmpty();
	req.checkBody('quality', 'quality cannot be empty').notEmpty();
	req.checkBody('requestedBy', 'requestedBy cannot be empty').notEmpty();

	var errors = req.validationErrors();
	console.log(errors);

	if(errors){
		//console.log(errors);
		res.send(errors);
	}else{
		console.log('else block called');
		var newOrder = new Order({
			quality:quality,
			quantity:quantity,
			requestedBy:requestedBy,
			requestedById:requestedById,
			date:date,
			status:status
		});

		Order.createOrder(newOrder, function (err, Order) {
			if(err){
				res.send('some error occured');
				throw err;
			}else{
				console.log(Order);
				res.send('Order created');
			}
		})
	}
});


//not using this
//this api is for cancelling a order and it takes an orderId and cancellation reason
router.post('/cancelorder', function(req, res){
	var orderId = req.body.orderId;
	var reason = req.body.reason;
	console.log(orderId);
	console.log(reason);
	console.log(req.body);
	Order.cancelOrder(orderId, reason, function(err, order){
		if(err)throw err;
		res.send('order is cancelled' + order);
	})
});


//not using this
//this post request is to add issues with some orders
router.post('/addissue', function(req, res){
	console.log(req.user);
	var title = req.body.title;
	var description = req.body.description;
	var orderId = req.body.orderId;
	var userId = req.user._id;
	var type = req.body.type;
	var date = Date.now();
	var status = 'submitted to manager';

	req.checkBody('title', 'title cannot be empty').notEmpty();
	req.checkBody('description', 'description cannot be empty').notEmpty();
	req.checkBody('orderId', 'orderId cannot be empty').notEmpty();
	req.checkBody('type', 'type cannot be empty').notEmpty();

	var errors = req.validationErrors();
	console.log(errors);
	
	if(errors){
		res.send(errors);
	}else{
		var newIssue = new Issue({
			title:title,
			type:type,
			description:description,
			orderId:orderId,
			userId:userId,
			date:date,
			status:status
		});

		Issue.addIssue(newIssue, function(err, issue){
			if(err)throw err;
			res.redirect('/');
		})
	}
});


//not using this
router.post('/requestquote', function(req, res){
	console.log(req);
	var quality = req.body.quality;
	var quantity = req.body.quantity;
	var customerSite = req.body.customerSite;
	var generationDate =  Date.now();
	var requiredDate = req.body.requiredDate;
	var requestedBy = req.user.name;
	var requestedById = req.user._id;

	req.checkBody('quantity', 'quantity cannot be empty').notEmpty();
	req.checkBody('quality', 'quality cannot be empty').notEmpty();
	req.checkBody('customerSite', 'customerSite cannot be empty').notEmpty();
	req.checkBody('requiredDate', 'requiredDate cannot be empty').notEmpty();

	var errors = req.validationErrors();
	console.log(errors);
	
	if(errors){
		res.send(errors);
	}else{
		var newQuote = new Quote({
			quantity : quantity,
			quality : quality,
			customerSite : customerSite,
			generationDate : generationDate,
			requiredDate : requiredDate,
			requestedBy : requestedBy,
			requestedById : requestedById
		});

		Quote.addQuote(newQuote, function(err, quote){
			res.send('new request for quote submitted for ' + quote.quantity + ' of ' + quote.quality  + ' quality redimix.');
		})
	};
});


//not using this
//this route will cancel an existing quote that was created by contractor
router.post('/cancelquote', function(req, res){
	var quoteId = req.body.quoteId;
	console.log(quoteId);
	console.log(req.body);
	Quote.cancelQuote(quoteId, function(err, quote){
		if(err)throw err;
		res.send('quote is cancelled' + quote);
	})
});



//this function checks if the user is in session or not
function isAuthenticated(req, res, next){
	if(req.isAuthenticated()){
		if(user.userType == 'supplier'){
			next();
		}else if(user.userType='contractor'){
			res.send('please login with your appropriate contractor window')
		}
	}else{
		res.redirect('/login');
	}
}
module.exports = router;
