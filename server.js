const express = require('express');
const axios = require('axios');
const moment = require('moment');

const app = express();
const PORT = process.env.PORT || 5000;

const JDRAPI = axios.create({
    baseURL: 'http://localhost:3000/',
    headers: {
        'Content-Type': 'application/json'
    }
});

let auth_token = '';

const registerCompany = async() => {
    try {
        const res = await JDRAPI.post('/register', {
            companyName: 'Affordmed'
        });

        return {
            client_id: res.data.clientID,
            client_secret: res.data.clientSecret
        };
    } catch (error) {
        console.log(error);
        throw new Error('Failed to register company');
    }
};

const getAccessToken = async(client_id, client_secret) => {
    try {
        const res = await JDRAPI.post('/auth', {
            companyName: 'Affordmed',
            clientID: client_id,
            clientSecret: client_secret
        });

        auth_token = res.data.access_token;
    } catch (error) {
        console.log(error);
        throw new Error('Failed to get access token');
    }
};


const fetchAllTrains = async() => {
    try {
        const res = await JDRAPI.get('/trains', {
            headers: {
                Authorization: `Bearer ${auth_token}`
            }
        });

        return res.data;
    } catch (error) {
        console.log(error);
        throw new Error('Failed to fetch trains');
    }
};





// Filter out trains if it > 30mins
const filterUpcomingTrains = (trains) => {
    const now = moment();
    return trains.filter(train => {
        const departureTime = moment({
            hour: train.departureTime.Hours,
            minute: train.departureTime.Minutes,
            second: train.departureTime.Seconds
        });
        const timeDiff = departureTime.diff(now, 'minutes');
        console.log(timeDiff);
        return timeDiff > 30;
    });
};



const calculateDepartureTime = (train) => {
    const now = moment();
    const departureTime = moment({
        hours: train.departureTime.Hours,
        minutes: train.departureTime.Minutes,
        seconds: train.departureTime.Seconds
    });
    const delay = train.delayedBy || 0;
    const scheduledDepartureTime = departureTime.add(delay, 'minutes');

    if (scheduledDepartureTime.diff(now, 'minutes') < 0) {

        scheduledDepartureTime.add(1, 'days');
    }

    return scheduledDepartureTime;
};


// Sorting trains by price, seats availability, and scheduled departure time
const sortTrains = (trains) => {
    return trains.sort((a, b) => {
        const priceA = Math.min(a.price.sleeper, a.price.AC);
        const priceB = Math.min(b.price.sleeper, b.price.AC);
        const seatsAvailableA = a.seatAvailable;
        const seatsAvailableB = b.seatAvailable;
        const scheduledDepartureTimeA = calculateDepartureTime(a);
        const scheduledDepartureTimeB = calculateDepartureTime(b);
        if (priceA < priceB) {
            return -1;
        } else if (priceA > priceB) {
            return 1;
        } else {
            if (seatsAvailableA > seatsAvailableB) {
                return -1;
            } else if (seatsAvailableA < seatsAvailableB) {
                return 1;
            } else {
                if (scheduledDepartureTimeA < scheduledDepartureTimeB) {
                    return -1;
                } else if (scheduledDepartureTimeA > scheduledDepartureTimeB) {
                    return 1;
                } else {
                    return 0;
                }
            }
        }
    });
};


app.get('/trains', async(req, res) => {
    try {
        const companyDetails = await registerCompany();
        await getAccessToken(companyDetails.client_id, companyDetails.client_secret);
        const allTrains = await fetchAllTrains();
        const upcomingTrains = filterUpcomingTrains(allTrains);
        const sortedTrains = sortTrains(upcomingTrains);
        res.json(sortedTrains);
        console.log(allTrains);
        console.log("SortedTrainsssss ........")
        console.log(sortedTrains);
        console.log("upcomingTrainsssss ........")
        console.log(upcomingTrains);

    } catch (error) {
        console.log(error);
        res.status(500).send('Failed to fetch upcoming trains');
    }
});

app.listen(PORT, () => console.log(`Server running on port ${ PORT }`));