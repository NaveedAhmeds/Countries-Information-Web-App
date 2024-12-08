require("dotenv").config();
require("pg"); // explicitly require the "pg" module for deployment compatibility
const Sequelize = require("sequelize");

// Initialize Sequelize instance
const sequelize = new Sequelize(
	process.env.DB_DATABASE,
	process.env.DB_USER,
	process.env.DB_PASSWORD,
	{
		host: process.env.DB_HOST,
		dialect: "postgres",
		port: 5432,
		dialectOptions: {
			ssl: { rejectUnauthorized: false },
		},
		logging: false, // Suppress logging; enable if debugging is required
	}
);

// Define SubRegion model
const SubRegion = sequelize.define(
	"SubRegion",
	{
		id: {
			type: Sequelize.INTEGER,
			primaryKey: true,
			autoIncrement: true,
		},
		subRegion: Sequelize.STRING,
		region: Sequelize.STRING,
	},
	{
		timestamps: false, // Disable automatic timestamps
	}
);

// Define Country model
const Country = sequelize.define(
	"Country",
	{
		id: {
			type: Sequelize.STRING,
			primaryKey: true,
		},
		commonName: Sequelize.STRING,
		officialName: Sequelize.STRING,
		nativeName: Sequelize.STRING,
		currencies: Sequelize.STRING,
		capital: Sequelize.STRING,
		languages: Sequelize.STRING,
		openStreetMaps: Sequelize.STRING,
		population: Sequelize.INTEGER,
		area: Sequelize.INTEGER,
		landlocked: Sequelize.BOOLEAN,
		coatOfArms: Sequelize.STRING,
		flag: Sequelize.STRING,
		subRegionId: Sequelize.INTEGER,
	},
	{
		timestamps: false,
	}
);

// Define relationship between Country and SubRegion
Country.belongsTo(SubRegion, { foreignKey: "subRegionId" });

// Initialize database
function initialize() {
	return sequelize
		.sync()
		.then(() => console.log("Database connection successful"))
		.catch((err) => console.error("Error connecting to database:", err));
}

// Fetch all countries with SubRegion included
function getAllCountries() {
	return Country.findAll({ include: [SubRegion] })
		.then((countries) => {
			console.log("Countries retrieved:", countries.length);
			return countries.map((c) => c.dataValues);
		})
		.catch((err) => {
			console.error("Error retrieving all countries:", err);
			throw err;
		});
}

// Fetch a country by ID with SubRegion included
// Fetch a country by ID with SubRegion included
function getCountryById(id) {
	return Country.findOne({
		include: [SubRegion],
		where: { id },
	})
		.then((country) => {
			if (!country) throw new Error("Unable to find requested country");
			console.log("Country retrieved:", country.dataValues);
			return country.dataValues;
		})
		.catch((err) => {
			console.error("Error retrieving country by ID:", err);
			throw err;
		});
}

// Fetch countries by SubRegion name
function getCountriesBySubRegion(subRegion) {
	return Country.findAll({
		include: [SubRegion],
		where: {
			"$SubRegion.subRegion$": {
				[Sequelize.Op.iLike]: `%${subRegion}%`,
			},
		},
	})
		.then((countries) => {
			if (countries.length === 0)
				throw new Error("Unable to find requested countries");
			console.log("Countries retrieved by SubRegion:", countries.length);
			return countries.map((c) => c.dataValues);
		})
		.catch((err) => {
			console.error("Error retrieving countries by SubRegion:", err);
			throw err;
		});
}

// Fetch countries by Region name
function getCountriesByRegion(region) {
	return Country.findAll({
		include: [SubRegion],
		where: {
			"$SubRegion.region$": region,
		},
	})
		.then((countries) => {
			if (countries.length === 0)
				throw new Error("Unable to find requested countries");
			console.log("Countries retrieved by Region:", countries.length);
			return countries.map((c) => c.dataValues);
		})
		.catch((err) => {
			console.error("Error retrieving countries by Region:", err);
			throw err;
		});
}

// Add a new country
function addCountry(countryData) {
	countryData.landlocked = !!countryData.landlocked; // Convert to boolean
	return Country.create(countryData)
		.then(() => console.log("Country added successfully:", countryData.id))
		.catch((err) => {
			console.error("Error adding country:", err);
			throw err;
		});
}

// Edit an existing country
function editCountry(id, countryData) {
	countryData.landlocked = !!countryData.landlocked; // Convert to boolean
	return Country.update(countryData, { where: { id } })
		.then(([affectedRows]) => {
			if (affectedRows === 0)
				throw new Error("Unable to update country, not found.");
			console.log("Country updated successfully:", id);
		})
		.catch((err) => {
			console.error("Error editing country:", err);
			throw err;
		});
}

// Delete a country by ID
function deleteCountry(id) {
	return Country.destroy({ where: { id } })
		.then((affectedRows) => {
			if (affectedRows === 0) throw new Error("Unable to delete country");
			console.log("Country deleted successfully:", id);
		})
		.catch((err) => {
			console.error("Error deleting country:", err);
			throw err;
		});
}

// Fetch all SubRegions
function getAllSubRegions() {
	return SubRegion.findAll()
		.then((subRegions) => {
			console.log("SubRegions retrieved:", subRegions.length);
			return subRegions.map((s) => s.dataValues);
		})
		.catch((err) => {
			console.error("Error retrieving all SubRegions:", err);
			throw err;
		});
}

module.exports = {
	initialize,
	getAllCountries,
	getCountryById,
	getCountriesByRegion,
	getCountriesBySubRegion,
	getAllSubRegions,
	addCountry,
	editCountry,
	deleteCountry,
};

// Previous Code for Models and CRUD Operations...

module.exports = {
	initialize,
	getAllCountries,
	getCountryById,
	getCountriesByRegion,
	getCountriesBySubRegion,
	getAllSubRegions,
	addCountry,
	editCountry,
	deleteCountry,
};

// Bulk Insert Code
const subRegionData = require("../data/subRegionData.json");
const countryData = require("../data/countryData.json");

sequelize
	.sync()
	.then(async () => {
		try {
			// Clean existing data with cascading truncation
			await sequelize.query(
				'TRUNCATE "Countries", "SubRegions" RESTART IDENTITY CASCADE;'
			);

			// Insert new data
			await SubRegion.bulkCreate(subRegionData);
			await Country.bulkCreate(countryData);
			console.log("-----");
			console.log("Data inserted successfully");
		} catch (err) {
			console.log("-----");
			console.error("Validation Error:", err);
		}

		// process.exit();
	})
	.catch((err) => {
		console.log("Unable to connect to the database:", err);
	});
