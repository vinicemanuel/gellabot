// Connect mqtt broker
const mqtt = require('mqtt')
const client = mqtt.connect('mqtt://broker.hivemq.com')

// Init tempereature sensor
var sensorLib = require('node-dht-sensor')
sensorLib.initialize(/*sensor*/22, /*pin*/12)

// Proximity sensor
var Gpio = require('pigpio').Gpio,
  trigger = new Gpio(6, {mode: Gpio.OUTPUT}),
  echo = new Gpio(16, {mode: Gpio.INPUT, alert: true})
  
// Variables
var pollTime = 1 * 5 * 1000 // polling time
var tollerance = 5000
var drink = null
var timeTable = {
	cerveja: 25,
	vinho: 20,
}
var tempTable = {
	cerveja: 8,
	vinho: 14,
}
var centFar = 5
var dist = 99999
var drinkOn = false
var currentTime = 0
var currentTemperature = -1
var temperatures = [] 

// The number of microseconds it takes sound to travel 1cm at 20 degrees celcius
var MICROSECDONDS_PER_CM = 1e6/34321;
trigger.digitalWrite(0) // Make sure trigger is low

// Proximity sensor
var startTick;
 echo.on('alert', (level, tick) => {
    var endTick, diff
    if (level == 1) {
      startTick = tick
    } else {
      endTick = tick;
      diff = (endTick >> 0) - (startTick >> 0); // Unsigned 32 bit arithmetic
      dist = (diff / 2 / MICROSECDONDS_PER_CM)
      if (dist <= centFar) {
		  drinkOn = true
		  startCount()
	  } else {
		  endCount()
	  }
    }
});

// Interval to check status
setInterval(() => {
	// Trigger a distance measurement once per second
	trigger.trigger(10, 1) // Set trigger high for 10 microseconds
}, 2000)

// Interval to check status
var interval = setInterval(() => {
	
	sendData('{ "temperature": ' + readTempData() +
			 ', "time": ' + calcTime() + ',' +
			 '"drink": "' + drink + '",' +
			 '"ready": ' + isReady() + ','+
			 '"drink_on": ' + drinkOn + '}'
	)
	console.log('passou 1 minuto')
	
	// update base temperature
	if (temperatures.length == 10){
		temperatures.pop()
		temperatures.push(currentTemperature)
	}else{
		temperatures.push(currentTemperature)
	} 
	currentTemperature = readTempData()
},pollTime)

// Publish status on broker topic
function sendData(data) {
	client.publish('gellabot_rasp', data)
}

// Subscribe to topic
client.on('connect', () => {
	client.subscribe('gellabot_telegram')
})

// Read data from sensor
function readTempData() {
	var readout = sensorLib.read()
	if (temperatures.length == 0) {
		temperatures.push(readout.temperature.toFixed(2))
	}
	
    currentTemperature = readout.temperature.toFixed(2)
	return readout.temperature.toFixed(2)
}

// Verify if the drink is ready to drink
function isReady() {
	if (drink) {
		return readTempData() <= tempTable[drink]
	}
	return false
}

// Calc time
function calcTime() {
	console.log(temperatures)
	
	if (drink){	
		var dif = (parseFloat(temperatures[0]) - parseFloat(temperatures[temperatures.length - 1])) 
		console.log(dif)
		var resp = ((temperatures.length * pollTime / 60000) * (currentTemperature - tempTable[drink])) / dif
		if (resp === Infinity){
			return tempTable[drink]
		}else{
			return Math.abs(resp).toFixed(0)
		}
	}else{
		return 0
	}
	 
}

// Initiate (when put can into recipient)
function startCount() {
	sendData('{ "temperature": ' + readTempData() +
			 ', "time": ' + calcTime() + ',' +
			 '"drink": "' + drink + '",' +
			 '"ready": ' + isReady() + ','+
			 '"drink_on": ' + drinkOn + '}'
	)
}

// End (when get the can of)
function endCount() {
	setTimeout(() => {
		if (dist > centFar) {
            drink = null
            temperatures = []
			sendData('{ "temperature": ' + readTempData() +
				 ', "time": ' + calcTime() + ',' +
				 '"drink": "' + drink + '",' +
				 '"ready": ' + isReady() + ','+
				 '"drink_on": ' + getDrinkOn() + '}'
			)
		}
	}, tollerance)
}

// Verify if drink is on recipient
function getDrinkOn() {
	if (dist > centFar) {
		drinkOn = false
	} else {
		drinkOn = true
	}
	return drinkOn
}

// Waits message from topic
client.on('message', (topic, message) => {
	if (topic === 'gellabot_telegram') {
		switch (message.toString('utf8')) {
			case 'cerveja':
				drink = 'cerveja'
			break
			case 'vinho':
				drink = 'vinho'
			break
			default:
				drink = null
			break
		}
	}
})