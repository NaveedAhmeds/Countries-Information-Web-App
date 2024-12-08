/********************************************************************************
 *  WEB322 – Assignment 06
 *
 *  I declare that this assignment is my own work in accordance with Seneca's
 *  Academic Integrity Policy:
 *
 *  https://www.senecacollege.ca/about/policies/academic-integrity-policy.html
 *
 *  Name: Naveed Ahmed Syed Student ID: 149739237 Date: 6th Dec,2024
 *
 *  Published URL:
 *
 ********************************************************************************/

const countryData = require("./modules/country-service");
const authData = require("./modules/auth-service");
const path = require("path");
const express = require("express");
const clientSessions = require("client-sessions");
require("dotenv").config();

const app = express();
const HTTP_PORT = process.env.PORT || 8080;

// Middleware
app.use(express.static(path.join(__dirname, "public")));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.set("view engine", "ejs");

// Client Sessions Middleware
app.use(
	clientSessions({
		cookieName: "session",
		secret: "assignment6_session_secret",
		duration: 2 * 60 * 60 * 1000,
		activeDuration: 1000 * 60 * 20,
	})
);

// Add session to local variables for templates
app.use((req, res, next) => {
	res.locals.session = req.session;
	next();
});

// Middleware for Protected Routes
function ensureLogin(req, res, next) {
	if (!req.session.user) {
		res.redirect("/login");
	} else {
		next();
	}
}

// Routes
app.get("/", (req, res) => res.render("home", { page: "/" }));

app.get("/about", (req, res) => {
	res.render("about", { page: "/about", session: req.session });
});

app.get("/addCountry", ensureLogin, async (req, res) => {
	try {
		const subRegions = await countryData.getAllSubRegions();
		res.render("addCountry", { subRegions, page: "/addCountry" });
	} catch (err) {
		res
			.status(500)
			.render("500", { message: `Error: ${err.message}`, page: "/addCountry" });
	}
});

app.post("/addCountry", ensureLogin, async (req, res) => {
	try {
		await countryData.addCountry(req.body);
		res.redirect("/countries");
	} catch (err) {
		res.render("500", {
			message: `I'm sorry, but we have encountered the following error: ${err.message}`,
			page: "/addCountry",
		});
	}
});

app.get("/countries", async (req, res) => {
	try {
		let countries = [];
		if (req.query.region) {
			countries = await countryData.getCountriesByRegion(req.query.region);
		} else if (req.query.subRegion) {
			countries = await countryData.getCountriesBySubRegion(
				req.query.subRegion
			);
		} else {
			countries = await countryData.getAllCountries();
		}
		res.render("countries", { countries, page: "/countries" });
	} catch (err) {
		res.status(404).render("404", { message: err.message, page: "/countries" });
	}
});

app.get("/countries/:id", async (req, res) => {
	try {
		const country = await countryData.getCountryById(req.params.id);
		res.render("country", { country, page: "/countries" });
	} catch (err) {
		res.status(404).render("404", { message: err.message, page: "/countries" });
	}
});

app.get("/editCountry/:id", ensureLogin, async (req, res) => {
	try {
		const country = await countryData.getCountryById(req.params.id);
		const subRegions = await countryData.getAllSubRegions();
		res.render("editCountry", { country, subRegions, page: "/editCountry" });
	} catch (err) {
		res
			.status(404)
			.render("404", { message: err.message, page: "/editCountry" });
	}
});

app.post("/editCountry", ensureLogin, async (req, res) => {
	try {
		await countryData.editCountry(req.body.id, req.body);
		res.redirect("/countries");
	} catch (err) {
		res.render("500", {
			message: `I'm sorry, but we have encountered the following error: ${err.message}`,
			page: "/editCountry",
		});
	}
});

app.get("/deleteCountry/:id", ensureLogin, async (req, res) => {
	try {
		await countryData.deleteCountry(req.params.id);
		res.redirect("/countries");
	} catch (err) {
		res.status(500).render("500", {
			message: `I'm sorry, but we have encountered the following error: ${err.message}`,
			page: "/countries",
		});
	}
});

// Authentication Routes
app.get("/login", (req, res) =>
	res.render("login", { errorMessage: null, page: "/login" })
);

app.post("/login", (req, res) => {
	req.body.userAgent = req.get("User-Agent");
	authData
		.checkUser(req.body)
		.then((user) => {
			req.session.user = {
				userName: user.userName,
				email: user.email,
				loginHistory: user.loginHistory,
			};
			res.redirect("/countries");
		})
		.catch((err) => {
			res.render("login", { errorMessage: err, page: "/login" });
		});
});

app.get("/register", (req, res) => {
	res.render("register", {
		errorMessage: null,
		successMessage: null,
		page: "/register",
	});
});

app.post("/register", (req, res) => {
	authData
		.registerUser(req.body)
		.then(() => {
			res.redirect("/login");
		})
		.catch((err) => {
			res.render("register", {
				errorMessage: err,
				successMessage: null,
				page: "/register",
			});
		});
});

app.get("/logout", (req, res) => {
	req.session.reset();
	res.redirect("/");
});

app.get("/userHistory", ensureLogin, (req, res) => {
	res.render("userHistory", { page: "/userHistory" });
});

// 404 Route
app.use((req, res) => {
	res.status(404).render("404", {
		message: "I'm sorry, we're unable to find what you're looking for.",
		page: "",
	});
});

// Initialize Modules and Start Server
Promise.all([countryData.initialize(), authData.initialize()])
	.then(() => {
		app.listen(HTTP_PORT, () => {
			console.log(`Server listening on: ${HTTP_PORT}`);
		});
	})
	.catch((err) => {
		console.error(`Unable to start server: ${err}`);
	});
