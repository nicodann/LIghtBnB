// const properties = require('./json/properties.json');
// const users = require('./json/users.json');
const { Pool } = require('pg');

const pool = new Pool({
  user: 'vagrant',
  password: '123',
  host: 'localhost',
  database: 'lightbnb'
});


/// Users

/**
 * Get a single user from the database given their email.
 * @param {String} email The email of the user.
 * @return {Promise<{}>} A promise to the user.
 */
const getUserWithEmail = function(email) {
  return pool
    .query(`SELECT * FROM users WHERE users.email = $1;`, [email])
    .then((result) => {
      return result.rows[0];
    })
    .catch((err) => {
      console.log(err);
    });
};
exports.getUserWithEmail = getUserWithEmail;

/**
 * Get a single user from the database given their id.
 * @param {string} id The id of the user.
 * @return {Promise<{}>} A promise to the user.
 */
const getUserWithId = function(id) {
  return pool
    .query(`SELECT * FROM users WHERE users.id = $1`, [id])
    .then((result) => {
      return result.rows[0];
    })
    .catch((err) => {
      console.log(err);
    });
};
exports.getUserWithId = getUserWithId;


/**
 * Add a new user to the database.
 * @param {{name: string, password: string, email: string}} user
 * @return {Promise<{}>} A promise to the user.
 */
const addUser =  function(user) {
  return pool
    .query(`INSERT INTO users (name, email, password) VALUES ($1, $2, $3) RETURNING *;`, [user.name, user.email, user.password])
    .then((result) => {
      return result.rows[0];
    })
    .catch((err) => {
      console.log(err);
    });
};
exports.addUser = addUser;

/// Reservations

/**
 * Get all reservations for a single user.
 * @param {string} guest_id The id of the user.
 * @return {Promise<[{}]>} A promise to the reservations.
 */
const getAllReservations = function(guestID, limit = 10) {
  return pool
    .query(`
      SELECT reservations.*, properties.*, avg(property_reviews.rating) AS average_rating
      FROM reservations
      JOIN properties ON reservations.property_id = properties.id
      JOIN property_reviews ON properties.id = property_reviews.property_id
      WHERE reservations.guest_id = $1
      GROUP BY reservations.id, properties.id
      ORDER BY start_date
      LIMIT $2;
      `, [guestID, limit])
    .then((result) => {
      return result.rows;
    })
    .catch((err) => {
      console.log(err);
    });
};
exports.getAllReservations = getAllReservations;

/// Properties

/**
 * Get all properties.
 * @param {{}} options An object containing query options.
 * @param {*} limit The number of results to return.
 * @return {Promise<[{}]>}  A promise to the properties.
 */

const generateQueryString = () => {

}

const getAllProperties = function(options, limit = 10) {

  console.log(options);

  const queryParams = [];

  let minRating = false;

  let queryString = `
  SELECT properties.*, avg(rating) AS average_rating
  FROM properties
  JOIN property_reviews ON properties.id = property_reviews.property_id
  `;
  
  for (const option in options) {

    if (options[option]) {

      if (option === 'minimum_rating') {

        minRating = true;

      } else if (options !== 'minium_rating') {
        if (queryParams.length === 0) {
        queryString += 'WHERE';
        } else if (options !== 'minium_rating' && queryParams.length !== 0) {
        queryString += ' AND';
        }

        if  (option === 'city') {
          queryParams.push(`%${options.city}%`);
          queryString += ` city LIKE $${queryParams.length}`;
        }
        if (option === 'owner_id') {
          queryParams.push(options.owner_id);
          queryString += ` owner_id = $${queryParams.length}`;
        }
        if (option === 'minimum_price_per_night') {
          queryParams.push(options.minimum_price_per_night * 100);
          queryString += ` cost_per_night >= $${queryParams.length}`;
        }
        if (option === 'maximum_price_per_night') {
          queryParams.push(options.maximum_price_per_night * 100);
          queryString += ` cost_per_night <= $${queryParams.length}`;
        }
      }
    }
  }

  
  
  queryString += `
  GROUP BY properties.id
  `
  
  if (minRating === true) {
    console.log('adding HAVING')
    queryParams.push(options.minimum_rating);
    queryString += `HAVING avg(rating) >= $${queryParams.length}`;
  }
  
  
  queryParams.push(limit);
  queryString += `
  ORDER BY cost_per_night
  LIMIT $${queryParams.length};
  `;

  return pool
    .query(queryString, queryParams)
    .then((result) => {
      return result.rows;
    })
    .catch((err) => {
      console.log(err.message);
    });
};
exports.getAllProperties = getAllProperties;


/**
 * Add a property to the database
 * @param {{}} property An object containing all of the property details.
 * @return {Promise<{}>} A promise to the property.
 */
const addProperty = function(property) {

  const queryParams = [];

  let values = '';

  let queryString = `INSERT INTO properties (`;

  for (const prop in property) {
    queryParams.push(property[prop]);
    if (queryParams.length === Object.keys(property).length) {
      values += `$${queryParams.length}`;
      queryString += `${prop}) VALUES ( ${values}) RETURNING *;`;
    } else {
      queryString += `${prop},`;
      values += `$${queryParams.length},`;
    }
  }

  return pool
    .query(queryString, queryParams)
    .then((result) => {
      return result.rows[0];
    })
    .catch((err) => {
      console.log(err);
    });
};
exports.addProperty = addProperty;