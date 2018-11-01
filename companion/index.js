// Import modules
import Weather from '../common/weather/phone';
import * as messaging from "messaging";
import { settingsStorage } from "settings";

console.log("Companion Started");

// starting weather companion
let weather = new Weather();

// Message socket opens
messaging.peerSocket.onopen = () => {
  console.log("Companion Socket Open");
  restoreSettings(); 
};

// Message socket closes
messaging.peerSocket.close = () => {
  console.log("Companion Socket Closed");
};


// Processing settings key and value - special processing for tinmezone offset
function processKeyValue(key, newValue) {
  
  let data = {
    key: key,
  };
  
  if (key == "secondaryTimezone") { // if this is timezone data - getting realtime timezone
    
      // setting initial values
      data.newValue = {
        timezoneName: JSON.parse(newValue).values[0].value.timezoneName,
        timezoneOffset: JSON.parse(newValue).values[0].value.timezoneOffset
      }
    
      console.log("static offset: " + data.newValue.timezoneOffset);
     
      let coordinates = JSON.parse(newValue).values[0].value.timezoneCoordinates;
    
      if (coordinates != '') { // coordinates exist - get dynanmic timezone 
    
        // getting realtime offset
         fetch('https://api.timezonedb.com/?' + coordinates + '&key=2F2TELTVDRIB&format=json')
            .then((response) => {return response.json()})
            .then((tmz) => { // on success - asssigning new offset and sending to the watch
                  data.newValue.timezoneOffset = parseInt(tmz.gmtOffset) / 60;
                  console.log("Got offset: " + data.newValue.timezoneOffset);
                  sendVal(data);
            })
            .catch((err) => {  // on error - sending value as is - with original value
                console.log("Got offset error: " + err);
                sendVal(data);
          });
        
      } else { // if this is local timezone or GMT - sending static values
          sendVal(data)
      }
    
  } else { // otherwise sending data as is
      data.newValue = newValue
      sendVal(data);
  }
  
  
}

// A user changes settings
settingsStorage.onchange = evt => {
  processKeyValue(evt.key, evt.newValue);
};


// Restore any previously saved settings and send to the device
function restoreSettings() {
  for (let index = 0; index < settingsStorage.length; index++) {
    let key = settingsStorage.key(index);
    if (key) {
        processKeyValue(key, settingsStorage.getItem(key));
    }
  }
}

// Send data to device using Messaging API
function sendVal(data) {
  if (messaging.peerSocket.readyState === messaging.peerSocket.OPEN) {
    messaging.peerSocket.send(data);
  }
}