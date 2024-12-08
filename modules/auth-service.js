const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
require("dotenv").config();

// MongoDB Connection
function initialize() {
	return new Promise((resolve, reject) => {
		mongoose
			.connect(process.env.MONGODB, {
				useNewUrlParser: true,
				useUnifiedTopology: true,
			})
			.then(() => {
				console.log("Connected to MongoDB");
				resolve();
			})
			.catch((err) => {
				console.error("Error connecting to MongoDB:", err);
				reject(err);
			});
	});
}

// Schema Definition
const Schema = mongoose.Schema;

const userSchema = new Schema({
	userName: { type: String, unique: true },
	password: String, // Password will be hashed
	email: String,
	loginHistory: [
		{
			dateTime: Date,
			userAgent: String,
		},
	],
});

// User Model
const User = mongoose.model("users", userSchema);

// Register User Function
function registerUser(userData) {
	return new Promise((resolve, reject) => {
		if (userData.password !== userData.password2) {
			return reject("Passwords do not match");
		}

		bcrypt
			.hash(userData.password, 10)
			.then((hashedPassword) => {
				userData.password = hashedPassword;

				const newUser = new User({
					userName: userData.userName,
					password: userData.password,
					email: userData.email,
					loginHistory: [],
				});

				return newUser.save();
			})
			.then(() => resolve())
			.catch((err) => {
				if (err.code === 11000) {
					reject("User Name already taken");
				} else {
					reject("There was an error creating the user: " + err);
				}
			});
	});
}

// Check User Function
function checkUser(userData) {
	return new Promise((resolve, reject) => {
		User.findOne({ userName: userData.userName })
			.then((user) => {
				if (!user) {
					return reject("Unable to find user: " + userData.userName);
				}

				bcrypt.compare(userData.password, user.password).then((isMatch) => {
					if (!isMatch) {
						return reject("Incorrect Password for user: " + userData.userName);
					}

					if (user.loginHistory.length >= 8) {
						user.loginHistory.pop();
					}

					user.loginHistory.unshift({
						dateTime: new Date(),
						userAgent: userData.userAgent,
					});

					User.updateOne(
						{ userName: user.userName },
						{ $set: { loginHistory: user.loginHistory } }
					)
						.then(() => resolve(user))
						.catch((err) => {
							reject("There was an error verifying the user: " + err);
						});
				});
			})
			.catch(() => reject("Unable to find user: " + userData.userName));
	});
}

module.exports = {
	initialize,
	registerUser,
	checkUser,
};
