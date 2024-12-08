import React, { useState, useEffect, useMemo } from 'react';
import { io } from 'socket.io-client';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, LineElement, PointElement, Title, Tooltip, Legend } from 'chart.js';
import zoomPlugin from 'chartjs-plugin-zoom';
import '../style/RealTimeData.css';

// Set up the socket connection
const socket = io('http://localhost:5000', {
    transports: ['websocket'],
    reconnect: true,
});

ChartJS.register(CategoryScale, LinearScale, LineElement, PointElement, Title, Tooltip, Legend, zoomPlugin);

const RealTimeData = () => {
    const [sensorData, setSensorData] = useState([]);
    const [selectedSensor, setSelectedSensor] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 20; // Number of data points per page
    const [chartData, setChartData] = useState({
        labels: [],
        datasets: [],
    });

    // Fetch initial sensor data from the backend
    useEffect(() => {
        socket.on('new-data', (data) => {
            console.log('New data received:', data);
            setSensorData((prevData) => {
                const updatedData = [...prevData, data].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
                return updatedData;
            });
        });

        socket.on('delete-data', () => {
            console.log('Delete data received');
            setSensorData([]);
            setChartData({
                labels: [],
                datasets: [],
            });
        });

        return () => {
            socket.off('new-data');
            socket.off('delete-data');
        };
    }, []);

    // Effect to update chart data whenever the selected sensor or page changes
    useEffect(() => {
        if (selectedSensor) {
            updateChartData(sensorData, selectedSensor, currentPage);
        }
    }, [sensorData, selectedSensor, currentPage]);

    // Function to group sensor data by sensor_id
    const groupSensorsById = (data) => {
        const grouped = {};
        data.forEach((item) => {
            if (!grouped[item.sensor_id]) {
                grouped[item.sensor_id] = [];
            }
            grouped[item.sensor_id].push(item);
        });
        return grouped;
    };

    // Memoize grouped sensor data
    const groupedSensorData = useMemo(() => groupSensorsById(sensorData), [sensorData]);

    // Update chart data based on the selected sensor and current page
    const updateChartData = (data, selectedSensor, currentPage) => {
        if (!selectedSensor) {
            setChartData({ labels: [], datasets: [] });
            return;
        }

        const filteredData = data.filter((item) => item.sensor_id === selectedSensor);
        const startIndex = (currentPage - 1) * itemsPerPage;
        const paginatedData = filteredData.slice(startIndex, startIndex + itemsPerPage);

        const groupedByTimestamp = {};
        paginatedData.forEach((item) => {
            const timestamp = new Date(item.timestamp).toLocaleTimeString();
            if (!groupedByTimestamp[timestamp]) {
                groupedByTimestamp[timestamp] = {};
            }
            item.params.forEach((param) => {
                groupedByTimestamp[timestamp][param.name] = param.value;
            });
        });

        const allLabels = Object.keys(groupedByTimestamp);
        const parameters = filteredData[0]?.params.map((param) => param.name) || [];
        const datasets = parameters.map((paramName) => {
            const paramData = allLabels.map((timestamp) => groupedByTimestamp[timestamp][paramName] || null);
            return {
                label: `${paramName} (${selectedSensor})`,
                data: paramData,
                borderColor: `hsl(${Math.random() * 360}, 70%, 50%)`,
                fill: false,
                pointRadius: 2,
                borderWidth: 2,
                tension: 0.4, // Smooth lines
            };
        });

        setChartData({
            labels: allLabels,
            datasets: datasets,
        });
    };

    // Handle sensor selection from dropdown
    const handleSensorChange = (event) => {
        const sensorId = event.target.value;
        setSelectedSensor(sensorId);
        setCurrentPage(1); // Reset to first page
    };

    // Handle page change
    const handlePageChange = (page) => {
        setCurrentPage(page);
    };

    // Calculate total pages
    const totalPages = Math.ceil(
        (sensorData.filter((item) => item.sensor_id === selectedSensor) || []).length / itemsPerPage
    );

    return (
        <div className="container">
            {/* Label and Dropdown for selecting sensor */}
            <div className="dropdown-container">
                <label htmlFor="sensor-select">Choose Sensor</label>
                <select id="sensor-select" onChange={handleSensorChange} value={selectedSensor || ''}>
                    <option value="">-- Select a Sensor --</option>
                    {Object.keys(groupedSensorData).map((sensorId) => (
                        <option key={sensorId} value={sensorId}>
                            {sensorId}
                        </option>
                    ))}
                </select>
            </div>

            {/* Chart */}
            <div className="chart-container">
                {selectedSensor && sensorData.length ? (
                    <Line
                        data={chartData}
                        options={{
                            plugins: {
                                zoom: {
                                    zoom: {
                                        wheel: {
                                            enabled: true,
                                        },
                                        pinch: {
                                            enabled: true,
                                        },
                                        mode: 'xy',
                                    },
                                    pan: {
                                        enabled: true,
                                        mode: 'xy',
                                    },
                                },
                                tooltip: {
                                    callbacks: {
                                        title: (tooltipItems) =>
                                            `Time: ${tooltipItems[0]?.label || ''}`,
                                        label: (tooltipItem) =>
                                            `${tooltipItem.dataset.label}: ${tooltipItem.raw}`,
                                    },
                                },
                            },
                            maintainAspectRatio: false,
                        }}
                    />
                ) : (
                    <div>No data available. Please select a sensor.</div>
                )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="pagination-container">
                    {Array.from({ length: totalPages }, (_, i) => (
                        <button
                            key={i}
                            className={`page-button ${currentPage === i + 1 ? 'active' : ''}`}
                            onClick={() => handlePageChange(i + 1)}
                        >
                            {i + 1}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

export default RealTimeData;
