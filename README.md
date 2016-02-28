I propose a simple API system that can be used for data collection, which has the following endpoints.

If we need increase capacity we can always scale the system on multiple machines.

* **GET /**

HTML Page 

* **OPTIONS \***

Allows cross domain for all URLS 

* **GET /help**

A list of available functionality in the system

```json
{
  "message": "Move along nothing to see here.",
  "routes": {
    "/help": "Shows the magical help",
    "/api": {
      "/events": [
        {
          "uri": "/",
          "method": [
            "GET"
          ],
          "description": "Get all the events in the system, this is without any filtering"
        },
        {
          "uri": "/query",
          "method": [
            "POST"
          ],
          "description": "Get the events from the database",
          "parameters": {
            "page": "Which page to show",
            "limit": "How many items to show per page",
            "startDate": "Set a start date in unix timestamp, if empty it will include all items from the start",
            "endDate": "Set an end date in unix timestamp, if empty it will include all items until",
            "eventType": "If set it will filter by an event, can be an array for multiple events"
          }
        },
        {
          "uri": "/",
          "method": [
            "POST"
          ],
          "description": "Register an event",
          "required": [
            "event_type"
          ],
          "parameters": {
            "event_type": "Type of event being sent",
            "ts": "UNIX timestamp in seconds",
            "params": "A key-value dictionary where the key must be a string but the value can be of any data type"
          }
        }
      ],
      "/stats": [
        {
          "uri": "/:type?",
          "method": [
            "GET"
          ],
          "description": "Gets the stats for the latest 48hours",
          "params": {
            ":type": "Can be any event type we need"
          }
        }
      ]
    }
  }
}
```

* **POST /api/events**

Every time we wish to store an event we will do a request to the URL above, the reason for this is so we can have a platform that is independent and we can collect data from any type of system we need, all we need to do is do a call to the endpoint to register the event.

Will return a 202 Status Code, for each request.

Random Event Generator 
----------------------

**./reg.sh** Generates random events between two dates that can be used for testing the system

```bash
$ ./reg.sh
Usage: random_event_generator.js <options>

Options:
  -u, --uri      Full URI to the API                                  [required]
  --total        How many events to send                          [default: 100]
  --startTime    Start timestamp (default: Now - 1day    [default: "1456606932"]
  --endTime      End timestamp (default: Now)            [default: "1456693332"]
  --concurrency  Concurrency                                      [default: 100]
  -h             Show help                                             [boolean]
```

Statistics
----------

We will calculate and keep 48h stats in Redis, and at the end of the day we will run an aggregation in the database and write the data directly to the database for keeping and querying.

As an approach to keeping statistics we can also design a system like [RRDT](https://en.wikipedia.org/wiki/RRDtool).
Storage of the hits to the API based on events will be done using the atomic function [HINCRBY](http://redis.io/commands/hincrby)
Another option to calculating metrics would be to use Redis Bitmaps which is extremely fast and consumes very little memory
Since we are storing the data in MongoDB, we can use aggregation or map reduce to periodically calculate it, like weekly, monthly, yearly.


### 48h stats 

We can store 48h+ statistics in Redis for fast access to the data. We can configure this one how to group the data, either by hours, minutes or seconds, in the configuration file.
The smaller the interval the more data is stored in redis. We do this so we have really fast access to how many events we have processed.
The reason why we store this in redis is so we can maintain a stateless API and every worker can have access to the real time data.
The timestamp key for the redis statistics is configurable in the configuration.
To speed up calculation and reduce calculation in the application we can store for multiple granularities at the same time in Redis.

### Aggregation

One simple example is aggregation by month and event type

```json
[
  {
    "$project": {
      "event_type": 1,
      "ts": 1
    }
  },
  {
    "$group": {
      "_id": {
        "year": {
          "$year": "$ts"
        },
        "month": {
          "$month": "$ts"
        },
        "day": {
          "$dayOfMonth": "$ts"
        },
        "pretty": {
          "$dateToString": {
            "format": "%Y-%m-%d",
            "date": "$ts"
          }
        },
        "event_type": "$event_type"
      },
      "total": {
        "$sum": 1
      }
    }
  },
  {
    "$project": {
      "_id": 0,
      "event_type": "$_id.event_type",
      "date": "$_id.pretty",
      "dateYear": "$_id.year",
      "dateMonth": "$_id.month",
      "dateDay": "$_id.day",
      "total": 1
    }
  }
]
```

Processors
----------

Here we can build various other engines like pushing the data to S3, or Redis or any other engine, we want.
If we build it like that we can add any other processing system we want at any time without touching the existing functionality, we will just be extending the current system with new functionality.

### Events 

To allow for multiple engines to write and provide with a flexibility of changing the processing engine in the future, we define processors in **processors/events.js** which can be used to process the data.

* JSON
* MongoDB
* Daily Redis Stats

Database
--------

### Events

The structure of the collection should be 

```json
{
   event_type: "String",
   ts: "UNIX Timestamp",
   params: "Object"
}
```

We should create index on **event_type**, **ts**, and a combined one in MongoDB for faster searching and aggregation.

Technologies 
------------

* node.js 

Because of it's speed and it's concurrency, which is required for any system that is used for collecting information, and because of its non blocking IO model.

* MongoDB

We store the data in a NoSQL database because of the nature of NoSQL database where we can store unstructured data, and for it's aggregation framework.
For a real production database, especially if we need to do heavy analysis it would be better to use a system like Hadoop for the analysis instead of MongoDB.
So in a production system I would use both MongoDB and Hadoop as they complement each other.

* Redis

The reason we used Redis is to be able to store and analyze some information so that every system can use it. And to provide a common shared state between all the systems. Though we should be careful even though all redis actions are atomic.

Storing the data 
----------------

Storing the data can be done in several ways, one would be to store the events raw as they come, we can either store them to HDD as a file, NoSQL database, group them by date or events or any other parameter that we would need and store it like that.
For storing on the file system and create the file names based on some unique identifier, like Twitter Snowflake (we can specify datacenter and worker to provide unique file for them).

How we can extend and analyze the data
--------------------------------------

* What times are the events coming in, so we can see during which times we have the most active users. Lets say we want to show ads, this way we can spread the ads over time based on the preferences of the users, to show them when it's peak, or to show them when it's not peak
* How many unique users for the day. We create a key like **unique-hits-2016-02-01** and use **BITSET** and **BITCOUNT**, and we can then just fetch all keys for the last n days and calculate the results if we want, depending on our needs we can make it more granular if we want to. This will work on extremely very large dataset, with very fast speed access.
* How many events by users
* How many events by time
* Analyzing the flow of data. From which events to which events we go next, so we can create a better picture of how the funnel works. The order of events, this way we can analyze how the users use and interact with the application.

