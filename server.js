const express = require('express')
const app = express()
const cors = require('cors')
require('dotenv').config()
const bodyParser = require('body-parser');
const mongoose = require('mongoose');

app.use(cors())
app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

//DATABASE SETUP.
const mySecret = process.env['MONGO_URI'];//check here if error
mongoose.connect(mySecret);

//SCHEMA.
const excerciseLogSchema = mongoose.Schema({
  "description": {"type": String, "required": true},
  "duration": {"type": Number, "required": true},
  "date": String
});

const userRecordSchema = mongoose.Schema({
  "username": {"type": String, "required": true},
  "log": [excerciseLogSchema]
});

//MODEL.
const SessionLogs = mongoose.model("SessionLogs", excerciseLogSchema);

const UserRecords = mongoose.model("UserRecords", userRecordSchema);

//BODY PARSER.
app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());

//API ENDPOINT(1) - POST / api/users (collecting the username and creating a new database records).
const apiUserPathPOST = '/api/users';

app.post(apiUserPathPOST, (request, response) => {
  const userName = request.body.username;

  const newUser = new UserRecords({"username": userName});
  newUser.save((error, userData) => {
    if (error) return console.log(error);
    response.json({
      "username": userData.username,
      "_id": userData.id
      });
  });
});

//API ENDPOINT(2) -  GET requests to /api/users returns an array.
const apiUserPathGET = '/api/users';
app.get(apiUserPathGET, (request, response) => {
  UserRecords.find({}, (error, users) =>{
    if (error) {
      console.log(error);
      response.send("Something went Wrong...")
    }
    response.json(users);
  });
});

//API ENDPOINT(3) -  POST /api/users/:_id/exercises. doublecheck it later
const apiUserExcercisePath = '/api/users/:_id/exercises';

app.post(apiUserExcercisePath, (request, response) => {
  
  let userId = request.params;
  let description = request.body.description;
  let duration = request.body.duration;
  let date = request.body.date;

    //date format condition.
    date = new Date(date).toDateString();

    if (date === "" || date === "Invalid Date") {
      const currentDate = new Date();
      date = currentDate.toDateString();
    }else {
      const currentDate = new Date(date);
      date = currentDate.toDateString();
    }
    
    //New Database Record.
    const newExcerciseRecord = new SessionLogs({
      "description": description,
      "duration": duration,
      "date": date
    });

    UserRecords.findByIdAndUpdate(
      userId, 
      {$push: {"log": newExcerciseRecord}}, 
      {new: true}, 
      (error, updatedRecord) => {
      if (error) {
        console.log(error);
        response.send("Something went Wrong... Check //API ENDPOINT(3)");
      }

      response.json({
        "username": updatedRecord.username,
        "description": newExcerciseRecord.description,
        "duration": newExcerciseRecord.duration,
        "date": newExcerciseRecord.date,
        "_id": updatedRecord.id
      });
    });
});

//API ENDPOINT(4) - GET request to /api/users/:_id/logs to retrieve a full exercise log of any user.
const apiUserExcercisePathGET = '/api/users/:_id/logs';

app.get(apiUserExcercisePathGET, (request, response) => {

    let userId = request.params;
    let fromQuery = request.query.from;
    let toQuery = request.query.to;
    let limitQuery = request.query.limit;

    UserRecords.findById(userId, (error, result) => {
      if (error) {
        console.log(error);
        response.send("Something Went wrong. Check //API ENDPOINT(4)");
      }
      let logs = result.log;
      let filteredLogs = logs.map(log => {
        
        let des = log.description;
        let dur = log.duration;
        let date = log.date;

        let userLogs = {
          "description": des,
          "duration": dur,
          "date": date
        };
        return userLogs;
      });

      let responseObject = {};

      responseObject['username'] = result.username;
      responseObject['count'] = result.log.length;
      responseObject['_id'] = result.id;
      responseObject['log'] = filteredLogs
    
    //for GET user's exercise log: GET /api/users/:_id/logs?[from][&to][&limit]
    function objectLimiter(input) {
        let limit = input.slice(0, limitQuery);
        return limit;
      }

      if (fromQuery || toQuery) {

        let fromDate = new Date(0);
        let toDate = new Date();

        //convert the date input to a date string.
        if (fromQuery) {
          fromDate = new Date(fromQuery);
        }
        if (toQuery) {
          toDate = new Date(toQuery);
        }

        fromDate = fromDate.getTime();
        toDate = toDate.getTime();

        //filters the user's exercise log and asign it to the responseObject.
        let logSearch = result.log.filter((session) => {
          let sessionDate = new Date(session.date).getTime();
          return sessionDate >= fromDate && sessionDate <= toDate;
        });

        responseObject['username'] = result.username;
        responseObject['count'] = logSearch.length;
        responseObject['_id'] = result.id;
        responseObject['log'] = logSearch;
      }

      //filters/slices the log to a given log length or count. 
      if (limitQuery) {
        responseObject['username'] = result.username;
        responseObject['count'] = objectLimiter(responseObject.log).length;
        responseObject['_id'] = result.id;
        responseObject['log'] = objectLimiter(responseObject.log);
      }

      response.json(responseObject);
    }); 
  });


  const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})

//the code below is used to clear the database. 

/*UserRecords.remove({}, (error, records) => {
  if (error) return console.log(error);
  console.log(records)
});*/