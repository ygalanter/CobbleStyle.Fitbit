//importing libraries
import clock from "clock";
import document from "document";
import {display} from "display";
import * as messaging from "messaging";
import * as fs from "fs";
import { me } from "appbit";
import {preferences} from "user-settings";
import dtlib from "../common/datetimelib"
import { battery } from "power";
import Weather from '../common/weather/device';
import {weather_icon } from '../common/weather/common.js';
import {monoDigit} from '../common/util.js'
import userActivity from "user-activity";


// Get a handle on the elements
let digitalTime = document.getElementById("digitalTime");
let lblDow = document.getElementById("dow");
let lblDate = document.getElementById("date");
let lblMonth = document.getElementById("month");
let icon = document.getElementById("icon");
let temp = document.getElementById("temp");
let topOption = document.getElementById("topOption");
let bottomOption = document.getElementById("bottomOption");
let batteryText = document.getElementById("batteryText");
let batteryBar = document.getElementById("batteryBar");
let batteryBackground = document.getElementById("batteryBackground");
let sidebarBackground = document.getElementById("sidebarBackground");
let separatorSecondary = document.getElementById("separatorSecondary"); 
let analogTime = document.getElementById("analog-watch-hands");
let secondHand = document.getElementById("secondHand");
let centerCircleMiddle = document.getElementById("centerCircleMiddle");

                                                
//consts
const METRIC = "steps";
const COLOR_AUTOMATIC = 0;
const COLOR_MANUAL = 1;

const OPTION_DISABLED = 0;
const OPTION_TEXT = 1;
const OPTION_AMPM = 2;
const OPTION_STEP_COUNTER = 3;
const OPTION_LOCATION = 4;
const OPTION_SECONDARY_TIMEZONE = 5;

const TIME_DIGITAL = 0;
const TIME_ANALOG = 1;


// reading time format preferemces
dtlib.timeFormat = preferences.clockDisplay == "12h" ? 1: 0;

document.getElementById("analog-watch-hands").style.display="none";

// Update the clock every minute
clock.granularity = "minutes";

// trying to get user settings if saved before
let userSettings;
try {
  userSettings = fs.readFileSync("user_settings.json", "json");
  //restoring previous weather
  icon.href = userSettings.iconHref;
  temp.text = userSettings.tempText;
  
} catch (e) {
  userSettings = {
    weatherInterval: 30, // update weather every 30 min
    weatherTemperature: "F", // display temperature in Fahrenheit
    weatherProvider: "yahoo", // possible: yahoo, owm, wunderground or darksky)
    weatherAPIkey: "", //by deafult API key is not set
    timeSeparator: ":", //possible : or .
    color: COLOR_AUTOMATIC,
    optionTop: OPTION_TEXT,
    optionBottom: OPTION_STEP_COUNTER,
    text: "FITBIT IONIC",
    location: "...",
    clockFace: TIME_DIGITAL,
    timezoneOffset: null, // secondary timezone UTC offset
    timezoneName: null, // secondary timezone short name
    iconHref: "images/unknown.png",
    tempText: "...°",
  }
}

function setClockFace(type) {
  if (type == TIME_DIGITAL) {
    digitalTime.style.display = "inline";
    analogTime.style.display = "none";
  } else {
    digitalTime.style.display = "none";
    analogTime.style.display = "inline";
  }
}

function setOption(optionField, optionType) {
    switch (optionType) {
      case OPTION_DISABLED:
        optionField.text = "";
        break;
      case OPTION_TEXT:
        optionField.text = userSettings.text.toUpperCase();
        break;
      case OPTION_AMPM:
        optionField.text = dtlib.getAmApm(today.getHours());
        break;
      case OPTION_STEP_COUNTER:
        optionField.text = userActivity.today.local[METRIC] + " steps";
        break;
      case OPTION_LOCATION:
        optionField.text = userSettings.location.toUpperCase();
        break;
      case OPTION_SECONDARY_TIMEZONE:
        let newToday;
       
        if (userSettings.timezoneOffset) { 
          let utc = today.getTime() + (today.getTimezoneOffset() * 60000);
          newToday = new Date(utc + (60000*userSettings.timezoneOffset));
        } else {
          newToday = today;
        }
        
        // formatting hours based on user preferences
        let hours = dtlib.format1224hour(newToday.getHours());
        let ampm = "";

        // if this is 24H format - prepending 1-digit hours with 0
        if (dtlib.timeFormat == dtlib.TIMEFORMAT_24H) {
            hours = dtlib.zeroPad(hours);
        } else {
            ampm = "  " + dtlib.getAmApm(newToday.getHours());
        }

        let mins = dtlib.zeroPad(newToday.getMinutes());
        
        let locName = ""
        if (userSettings.timezoneName != null) {
          locName = userSettings.timezoneName + " ";
        }

        optionField.text = `${locName}${hours}${userSettings.timeSeparator}${mins}${ampm}`;
       
        break;
      default:
        console.log("How the hell did we get here?");
        break;
    }
 
}

// on app exit collect settings 
me.onunload = () => {
    fs.writeFileSync("user_settings.json", userSettings, "json");
}

// setting interval to fetch weather
let iWeatherInterval; 
function setWeatherInterval(interval) {
  clearInterval(iWeatherInterval);
  iWeatherInterval = setInterval(() => weather.fetch(), interval * 60 * 1000); 
}

// setting weather provider
let weather = new Weather();
function setWeatherProvider(provider, apikey) {
  weather.setProvider(provider); 
  weather.setApiKey(apikey);
  weather.setMaximumAge(25 * 1000); 
  console.log("1. Provider: " + provider);
  console.log("1. API Key: " + apikey);
}

let sidebarPrimaryColor = "forestgreen";
let sidebarSecondaryColor = "darkgreen";

function updateBattery(charge) {
  batteryText.text = `${charge}%`;
  batteryBar.width = 51*charge/100;
  
  if (userSettings.color == COLOR_MANUAL) return;
  
  if (charge < 20) {
      sidebarPrimaryColor = "#F83C40";
      sidebarSecondaryColor = "maroon";    
  } else if (charge < 50) {
      sidebarPrimaryColor = "darkorange";
      sidebarSecondaryColor = "darkred";    
  } else {
      sidebarPrimaryColor = "forestgreen";
      sidebarSecondaryColor = "darkgreen";
  }
 
   batteryBackground.style.fill = sidebarPrimaryColor;
   sidebarBackground.style.fill = sidebarPrimaryColor;
   separatorSecondary.style.fill = sidebarSecondaryColor;
   secondHand.style.fill = sidebarPrimaryColor;
   centerCircleMiddle.style.fill = sidebarPrimaryColor;
}


// Update the <text> element with the current time
let today;
function updateClock() {
  today = new Date();
  
  // formatting hours based on user preferences
  let hours = dtlib.format1224hour(today.getHours());
  
  // if this is 24H format - prepending 1-digit hours with 0
  if (dtlib.timeFormat == dtlib.TIMEFORMAT_24H) {
      hours = dtlib.zeroPad(hours);
  }  
  
  let mins = dtlib.zeroPad(today.getMinutes());

  digitalTime.text = `${hours}${userSettings.timeSeparator}${mins}`;
  
   // displaying short month name in English
  lblMonth.text = dtlib.getMonthNameShort(dtlib.LANGUAGES.ENGLISH, today.getMonth());
  
  // displaying 0-prepended day of the month
  lblDate.text = dtlib.zeroPad(today.getDate());
  
  // displaying shot day of the week in English
  lblDow.text = dtlib.getDowNameShort(dtlib.LANGUAGES.ENGLISH, today.getDay());
  
  // updating options' text
  setOption(topOption, userSettings.optionTop);
  setOption(bottomOption, userSettings.optionBottom);
 
}

// Update the clock every tick event
clock.ontick = () => updateClock();
  

// setting weather provider
let weather = new Weather();

// Display the weather data received from the companion
weather.onsuccess = (data) => {
  console.log("Device weather: " + JSON.stringify(data));
  // setting weather icon
  icon.href = "images/" + weather_icon[data.isDay? "day" : "night"][data.conditionCode];
  
  //setting temperature
  temp.text = Math.round(data[`temperature${userSettings.weatherTemperature}`]) + "°"
  
  // preserving in user settings
  userSettings.iconHref = icon.href;
  userSettings.tempText = temp.text;
  userSettings.location = data.location;
  
  // updating location text if option is set
  setOption(topOption, userSettings.optionTop);
  setOption(bottomOption, userSettings.optionBottom);
  
}

weather.onerror = (error) => {
  console.log("Device weather error: " + JSON.stringify(error));
 
  // setting weather icon
  icon.href = "images/unknown.png";
  
  //setting temperature
  temp.text = "...°"
  
  // preserving in user settings
  userSettings.iconHref = icon.href;
  userSettings.tempText = temp.text;
  userSettings.location = "...";
  
  // updating location text if option is set
  setOption(topOption, userSettings.optionTop);
  setOption(bottomOption, userSettings.optionBottom);
  
}

// on socket open - begin fetching weather
messaging.peerSocket.onopen = () => {
  // kicking off weather updates
  console.log("App socket open")
  setWeatherProvider(userSettings.weatherProvider, userSettings.weatherAPIkey);
  setWeatherInterval(userSettings.weatherInterval);
  weather.fetch(); 
}

// Message socket closes
messaging.peerSocket.onclose = () => {
  
}

// check if a setting has changed and if it is - updates it and optionally calls callback function
function updateSettings(objSettings, key, newValue, onUpdate) {
  if (objSettings[key] != newValue) {
    objSettings[key] = newValue;
    if (onUpdate) {
      onUpdate()
    }
  }
}


messaging.peerSocket.onmessage  = evt =>  {
  
   switch (evt.data.key) {
     case "weatherInterval":
       updateSettings(userSettings, evt.data.key, JSON.parse(evt.data.newValue).values[0].value, ()=>{setWeatherInterval(userSettings.weatherInterval)});
       break;
     case "weatherProvider":
        updateSettings(userSettings, evt.data.key, JSON.parse(evt.data.newValue).values[0].value, ()=>{setWeatherProvider(userSettings.weatherProvider, userSettings.weatherAPIkey)});
       break;
     case "weatherAPIkey":
       updateSettings(userSettings, evt.data.key, JSON.parse(evt.data.newValue).name, ()=>{setWeatherProvider(userSettings.weatherProvider, userSettings.weatherAPIkey)});
       break;
     case "weatherTemperature":
       updateSettings(userSettings, evt.data.key, JSON.parse(evt.data.newValue).values[0].value, ()=> {weather.fetch()});
       break;
    case "timeSeparator":
       updateSettings(userSettings, evt.data.key, JSON.parse(evt.data.newValue).values[0].value, ()=> {updateClock()});
       break;
     case "optionTop":
       updateSettings(userSettings, evt.data.key, JSON.parse(evt.data.newValue).values[0].value, ()=> {setOption(topOption, userSettings.optionTop)});
       break;
     case "optionBottom":
       updateSettings(userSettings, evt.data.key, JSON.parse(evt.data.newValue).values[0].value, ()=> {setOption(bottomOption, userSettings.optionBottom)});
       break;       
     case "text":
       updateSettings(userSettings, evt.data.key, JSON.parse(evt.data.newValue).name);
       break;
     case "clockFace":
       updateSettings(userSettings, evt.data.key, JSON.parse(evt.data.newValue).values[0].value, ()=> {setClockFace(userSettings.clockFace)});
       break;
     case "secondaryTimezone":
       userSettings.timezoneName = evt.data.newValue.timezoneName;
       userSettings.timezoneOffset = evt.data.newValue.timezoneOffset;
   }
 
  
}

//setting clockface
setClockFace(userSettings.clockFace);
       
// Don't start with a blank screen
updateClock();

//battery
updateBattery(Math.floor(battery.chargeLevel));
battery.onchange = () => {updateBattery(Math.floor(battery.chargeLevel))};


