import axios from 'axios';

const api = axios.create({
    baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000/api',
    headers: {
        'Content-Type': 'application/json'
    },
    withCredentials: true // Allows cookies and credentials to be sent
});


export const getSensorReadings = async () => {
    try {
        const response = await api.get('/sensors/get-sensor-readings');
        return response.data;
    } catch (error) {
        console.error('Error fetching sensor data:', error);
        throw error;  // Re-throw the error to handle it in the component
    }
};

export const getAllSensors = async () => {
    try {
        const response = await api.get('/sensors/get-all-sensors');
        return response.data;
    } catch (error) {
        console.error('Error getAllSensors():', error);
        throw error;  // Re-throw the error to handle it in the component
    }
};

export const getFilteredSensors = async (querry) => {
    try {
        const response = await api.get(`sensors/filter/sensor-readings?${querry.toString()}`);
        return response.data;
    } catch (error) {
        console.error('Error getAllSensors():', error);
        throw error;  // Re-throw the error to handle it in the component
    }
};

export default api;
