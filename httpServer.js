const express = require("express");
const bodyParser = require("body-parser");

let httpServer = ({dbCli, httpPort, checkCredentials}) => {
  return new Promise((resolve, reject) => {
    try {
      const app = express();
      app.use(bodyParser.json());
      app.use(bodyParser.urlencoded({extended: false}));
      app.use(express.static('public'));

      require('./routes')({dbCli, httpPort, checkCredentials, httpApp: app}).then(
        () => resolve(app)
      ).catch(error => reject(error))

    } catch(error) {
      reject(error)
    }
  })
}

module.exports = httpServer