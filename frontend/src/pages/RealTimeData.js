import React, { useState, useEffect, useMemo } from 'react';
import { io } from 'socket.io-client';
import { Line, Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, LineElement, PointElement, BarElement, Title, Tooltip, Legend } from 'chart.js';
import zoomPlugin from 'chartjs-plugin-zoom';
import '../style/RealTimeData.css';

// Set up the socket connection
const socket = io('http://localhost:5000', {
    transports: ['websocket'],
    reconnect: true,
});

ChartJS.register(CategoryScale, LinearScale, LineElement, PointElement, BarElement, Title, Tooltip, Legend, zoomPlugin);

const RealTimeData = () => {
    const [sensorData, setSensorData] = useState([]);
    const [selectedSensor, setSelectedSensor] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 20; // Number of data points per page
    const [chartData, setChartData] = useState({
        labels: [],
        datasets: [],
    });
    const [chartType, setChartType] = useState('line');

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
            const units = filteredData[0]?.params.find((param) => param.name === paramName)?.units || '';
            const paramData = allLabels.map((timestamp) => groupedByTimestamp[timestamp][paramName] || null);
            return {
                label: `${paramName} (${units}, ${selectedSensor})`, // Add units to the label
                data: paramData,
                borderColor: `hsl(${Math.random() * 360}, 70%, 50%)`,
                backgroundColor: `hsl(${Math.random() * 360}, 70%, 70%)`, // For bar chart
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

    // Export Chart as Image
    const exportChartAsImage = () => {
        const chartInstance = ChartJS.getChart('chartCanvasId'); // Replace with your chart canvas ID
        const url = chartInstance.toBase64Image();
        const link = document.createElement('a');
        link.href = url;
        link.download = 'chart.png';
        link.click();
    };

    // Export Data as JSON
    const exportDataAsJson = () => {
        const dataToExport = sensorData.filter((item) => item.sensor_id === selectedSensor);
        const jsonBlob = new Blob([JSON.stringify(dataToExport, null, 2)], { type: 'application/json' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(jsonBlob);
        link.download = 'sensor_data.json';
        link.click();
    };

    // Toggle chart type
    const toggleChartType = () => {
        setChartType((prevType) => (prevType === 'line' ? 'bar' : 'line'));
    };

    return (
        <div className="container" style={{ height: '100vh', overflow: 'hidden' }}>
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
            <div className="chart-container" style={{ height: '70vh' }}>
                {selectedSensor && sensorData.length ? (
                    chartType === 'line' ? (
                        <Line
                            id="chartCanvasId"
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
                        <Bar
                            id="chartCanvasId"
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
                    )
                ) : (
                    <div>No data available. Please select a sensor.</div>
                )}
            </div>

            {/* Export and Toggle Buttons */}
            <div className="export-buttons">
                <button className="styled-button" onClick={exportChartAsImage}>Export Chart as Image</button>
                <button className="styled-button" onClick={exportDataAsJson}>Export Data as JSON</button>
                <button className="styled-button" onClick={toggleChartType}>Toggle Chart Type</button>
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
