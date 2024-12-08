import React, { useState, useEffect } from 'react';
import { Line, Bar } from 'react-chartjs-2';
import { Chart as ChartJS, Title, Tooltip, Legend, CategoryScale, LinearScale, BarElement, PointElement, LineElement } from 'chart.js';
import { getAllSensors, getFilteredSensors } from "../services/api";

ChartJS.register(Title, Tooltip, Legend, CategoryScale, LinearScale, BarElement, PointElement, LineElement);

const CompareData = () => {
  const [chartType, setChartType] = useState('line');
  const [sensors, setSensors] = useState([]);
  const [selectedSensors, setSelectedSensors] = useState([null, null]);
  const [sensorData, setSensorData] = useState({});
  const [pagination, setPagination] = useState({});
  const [loading, setLoading] = useState(false);

  const colorPalette = [
    'rgba(255, 99, 132, 1)',
    'rgba(54, 162, 235, 1)',
    'rgba(255, 206, 86, 1)',
    'rgba(75, 192, 192, 1)',
    'rgba(153, 102, 255, 1)',
    'rgba(255, 159, 64, 1)',
  ];

  useEffect(() => {
    const fetchSensors = async () => {
      try {
        const response = await getAllSensors();
        setSensors(response);
      } catch (error) {
        console.error('Error fetching sensors:', error);
      }
    };

    fetchSensors();
  }, []);

  const fetchSensorData = async (sensorId, page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        sensorId,
        page,
        limit: 20,
      });

      const response = await getFilteredSensors(params);

      setSensorData((prevData) => ({
        ...prevData,
        [sensorId]: response.data,
      }));

      setPagination((prev) => ({
        ...prev,
        [sensorId]: {
          page,
          total: response.total,
          limit: 20,
        },
      }));
    } catch (error) {
      console.error(`Error fetching data for sensor ${sensorId}:`, error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedSensors[0]) fetchSensorData(selectedSensors[0], 1);
    if (selectedSensors[1]) fetchSensorData(selectedSensors[1], 1);
  }, [selectedSensors]);

  const getGroupedData = (sensorId) => {
    const data = sensorData[sensorId] || [];

    const groupedData = {};
    const timestamps = Array.from(new Set(data.map((entry) => entry.timestamp)));

    timestamps.forEach((timestamp) => {
      const record = data.find((entry) => entry.timestamp === timestamp);
      if (record) {
        record.params.forEach((param) => {
          if (!groupedData[param.name]) {
            groupedData[param.name] = { values: {}, units: param.units };
          }
          groupedData[param.name].values[timestamp] = param.value;
        });
      }
    });

    Object.keys(groupedData).forEach((param) => {
      timestamps.forEach((timestamp) => {
        if (!groupedData[param].values[timestamp]) {
          groupedData[param].values[timestamp] = null;
        }
      });
    });

    return { groupedData, timestamps };
  };

  const generateChartData = () => {
    const { groupedData: groupedData1, timestamps: timestamps1 } = selectedSensors[0]
      ? getGroupedData(selectedSensors[0])
      : { groupedData: {}, timestamps: [] };

    const { groupedData: groupedData2, timestamps: timestamps2 } = selectedSensors[1]
      ? getGroupedData(selectedSensors[1])
      : { groupedData: {}, timestamps: [] };

    const allTimestamps = Array.from(new Set([...timestamps1, ...timestamps2])).sort();

    const datasets = [];
    const uniqueParams = Array.from(
      new Set([...Object.keys(groupedData1), ...Object.keys(groupedData2)])
    );

    uniqueParams.forEach((param, index) => {
      const color = colorPalette[index % colorPalette.length];

      if (selectedSensors[0]) {
        datasets.push({
          label: `${param} (Sensor ${selectedSensors[0]}, ${groupedData1[param]?.units || ''})`,
          data: allTimestamps.map((timestamp) => groupedData1[param]?.values[timestamp] ?? null),
          borderColor: color,
          backgroundColor: color.replace('1)', '0.2)'),
          fill: false,
          tension: 0.4,
        });
      }
      if (selectedSensors[1]) {
        datasets.push({
          label: `${param} (Sensor ${selectedSensors[1]}, ${groupedData2[param]?.units || ''})`,
          data: allTimestamps.map((timestamp) => groupedData2[param]?.values[timestamp] ?? null),
          borderColor: color,
          backgroundColor: color.replace('1)', '0.2)'),
          fill: false,
          tension: 0.4,
        });
      }
    });

    return {
      labels: allTimestamps.map((timestamp) => new Date(timestamp).toLocaleString()),
      datasets,
    };
  };

  const changePage = (sensorId, direction) => {
    const sensorPagination = pagination[sensorId];
    if (!sensorPagination) return;

    const { page, total, limit } = sensorPagination;
    const maxPage = Math.ceil(total / limit);

    if (direction === 'prev' && page > 1) {
      fetchSensorData(sensorId, page - 1);
    } else if (direction === 'next' && page < maxPage) {
      fetchSensorData(sensorId, page + 1);
    }
  };

  const chartData = generateChartData();

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      title: {
        display: true,
        text: 'Sensor Parameter Evolution Over Time',
      },
    },
    scales: {
      x: {
        title: {
          display: true,
          text: 'Time',
        },
      },
      y: {
        title: {
          display: true,
          text: 'Values',
        },
        beginAtZero: true,
      },
    },
  };

  return (
    <div style={{ height: '100vh', padding: '20px', boxSizing: 'border-box' }}>
      <h2 style={{ textAlign: 'center', marginBottom: '20px' }}>Sensor Parameter Evolution</h2>

      <div style={{ textAlign: 'center', marginBottom: '20px' }}>
        <select
          onChange={(e) => setSelectedSensors([e.target.value, selectedSensors[1]])}
          value={selectedSensors[0] || ''}
          style={{ padding: '10px', borderRadius: '5px', marginRight: '10px' }}
        >
          <option value="">Select Sensor 1</option>
          {sensors.map((sensor) => (
            <option key={sensor} value={sensor}>
              {sensor}
            </option>
          ))}
        </select>
        <select
          onChange={(e) => setSelectedSensors([selectedSensors[0], e.target.value])}
          value={selectedSensors[1] || ''}
          style={{ padding: '10px', borderRadius: '5px', marginRight: '10px' }}
        >
          <option value="">Select Sensor 2</option>
          {sensors.map((sensor) => (
            <option key={sensor} value={sensor}>
              {sensor}
            </option>
          ))}
        </select>
      </div>

      <div style={{ textAlign: 'center', marginBottom: '20px' }}>
        <button
          onClick={() => setChartType('line')}
          style={{
            padding: '10px 20px',
            borderRadius: '5px',
            border: chartType === 'line' ? '2px solid #2196F3' : '1px solid #ccc',
            backgroundColor: chartType === 'line' ? '#2196F3' : '#f5f5f5',
            color: chartType === 'line' ? 'white' : '#333',
            marginRight: '10px',
          }}
        >
          Line Chart
        </button>
        <button
          onClick={() => setChartType('bar')}
          style={{
            padding: '10px 20px',
            borderRadius: '5px',
            border: chartType === 'bar' ? '2px solid #2196F3' : '1px solid #ccc',
            backgroundColor: chartType === 'bar' ? '#2196F3' : '#f5f5f5',
            color: chartType === 'bar' ? 'white' : '#333',
          }}
        >
          Bar Chart
        </button>
      </div>

      <div style={{ height: '600px', marginBottom: '20px' }}>
        {chartType === 'line' ? <Line data={chartData} options={options} /> : <Bar data={chartData} options={options} />}
      </div>

      {selectedSensors.map((sensorId, index) => (
        sensorId && pagination[sensorId] && (
          <div key={index} style={{ textAlign: 'center', marginTop: '20px' }}>
            <h4 style={{ marginBottom: '10px' }}>Sensor {sensorId}</h4>
            <button
              onClick={() => changePage(sensorId, 'prev')}
              disabled={pagination[sensorId].page === 1 || loading}
              style={{
                padding: '10px 15px',
                borderRadius: '5px',
                border: 'none',
                backgroundColor: pagination[sensorId].page === 1 ? '#ccc' : '#007BFF',
                color: 'white',
                marginRight: '10px',
                cursor: pagination[sensorId].page === 1 ? 'not-allowed' : 'pointer',
              }}
            >
              Previous Page
            </button>
            <span>
              Page {pagination[sensorId].page} of {Math.ceil(pagination[sensorId].total / pagination[sensorId].limit)}
            </span>
            <button
              onClick={() => changePage(sensorId, 'next')}
              disabled={
                pagination[sensorId].page >= Math.ceil(pagination[sensorId].total / pagination[sensorId].limit) || loading
              }
              style={{
                padding: '10px 15px',
                borderRadius: '5px',
                border: 'none',
                backgroundColor:
                  pagination[sensorId].page >= Math.ceil(pagination[sensorId].total / pagination[sensorId].limit)
                    ? '#ccc'
                    : '#007BFF',
                color: 'white',
                marginLeft: '10px',
                cursor:
                  pagination[sensorId].page >= Math.ceil(pagination[sensorId].total / pagination[sensorId].limit)
                    ? 'not-allowed'
                    : 'pointer',
              }}
            >
              Next Page
            </button>
          </div>
        )
      ))}
    </div>
  );
};

export default CompareData;
