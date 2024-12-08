import React, { useEffect, useState } from "react";
import { Line, Bar } from "react-chartjs-2";
import { getAllSensors, getFilteredSensors } from "../services/api";
import {
  Chart as ChartJS,
  LineElement,
  BarElement,
  CategoryScale,
  LinearScale,
  PointElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(LineElement, BarElement, CategoryScale, LinearScale, PointElement, Title, Tooltip, Legend);

const colors = ["#FF6384", "#36A2EB", "#FFCE56", "#4BC0C0", "#9966FF"];

const chartOptions = (sensor) => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: true, position: "top" },
    title: { display: true, text: `Sensor Readings for ${sensor || "All Sensors"}` },
  },
  scales: {
    x: {
      title: { display: true, text: "Time" },
      ticks: {
        maxRotation: 0,
        autoSkip: true,
      },
    },
    y: {
      title: { display: true, text: "Value" },
      beginAtZero: true,
    },
  },
});

const FormInput = ({ label, value, onChange, type = "text" }) => (
  <div style={{ margin: "0 10px" }}>
    <label>
      {label}: {" "}
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          padding: "5px",
          borderRadius: "5px",
          border: "1px solid #ccc",
          width: "150px",
        }}
      />
    </label>
  </div>
);

const HistoryData = () => {
  const [sensorData, setSensorData] = useState([]);
  const [chartData, setChartData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [validationError, setValidationError] = useState("");
  const [availableSensors, setAvailableSensors] = useState([]);
  const [selectedSensor, setSelectedSensor] = useState("");
  const [chartType, setChartType] = useState("line");

  const [filters, setFilters] = useState({
    startDate: "",
    endDate: "",
  });

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const pageSize = 10;

  useEffect(() => {
    const fetchSensors = async () => {
      try {
        const sensors = await getAllSensors();
        setAvailableSensors(sensors);
      } catch (err) {
        console.log("Failed to fetch sensors. Please try again later.");
      }
    };

    fetchSensors();
  }, []);

  const fetchFilteredData = async (page = 1) => {
    if (!selectedSensor) {
      setSensorData([]);
      setTotalPages(1);
      return;
    }
  
    const { startDate, endDate } = filters;
  
    try {
      setLoading(true);
      const params = new URLSearchParams({
        sensorId: selectedSensor,
        startDate,
        endDate,
        page,
        limit: pageSize,
      });
  
      const response = await getFilteredSensors(params);
  
      if (!response || !response.data || !Array.isArray(response.data)) {
        throw new Error("Invalid response format");
      }

      console.log(response);
  
      setSensorData(response.data);
      setTotalPages(Math.ceil(response.total / pageSize));
    } catch (err) {
      console.log("Failed to fetch sensor data. Please try again later.");
    } finally {
      setLoading(false);
    }
  };  

  useEffect(() => {
    if (!sensorData || sensorData.length === 0) {
      setChartData(null);
      return;
    }

    const groupedData = {};
    sensorData.forEach((reading) => {
      const timestamp = new Date(reading.timestamp).toLocaleString();
      reading.params.forEach((param) => {
        if (!groupedData[param.name]) {
          groupedData[param.name] = { data: [], timestamps: [] };
        }
        groupedData[param.name].data.push(param.value);
        groupedData[param.name].timestamps.push(timestamp);
      });
    });

    const datasets = Object.entries(groupedData).map(([name, { data }], index) => ({
      label: name,
      data,
      borderColor: colors[index % colors.length],
      backgroundColor: `${colors[index % colors.length]}33`,
      tension: 0.4,
      pointRadius: 3,
    }));

    setChartData({
      labels: groupedData[Object.keys(groupedData)[0]]?.timestamps || [],
      datasets,
    });
  }, [sensorData]);

  const handleClearFilters = () => {
    setFilters({
      startDate: "",
      endDate: "",
    });
    setSelectedSensor("");
    setSensorData([]);
    setChartData(null);
    setValidationError("");
    setCurrentPage(1); // Reset to the first page
    setTotalPages(1);  // Reset total pages
  };
  

  const handlePageChange = (newPage) => {
    if (newPage > 0 && newPage <= totalPages) {
      setCurrentPage(newPage);
      fetchFilteredData(newPage);
    }
  };

  return (
    <div
      style={{
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "20px",
        boxSizing: "border-box",
        overflow: "hidden",
      }}
    >
      <h2>Sensor Data Visualization</h2>
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          flexWrap: "wrap",
          marginBottom: "20px",
        }}
      >
        <div style={{ margin: "0 10px" }}>
          <label>
            Sensor: {" "}
            <select
              value={selectedSensor}
              onChange={(e) => setSelectedSensor(e.target.value)}
              style={{
                padding: "5px",
                borderRadius: "5px",
                border: "1px solid #ccc",
                width: "150px",
              }}
            >
              <option value="">-- Select --</option>
              {availableSensors.map((sensor) => (
                <option key={sensor} value={sensor}>
                  {sensor}
                </option>
              ))}
            </select>
          </label>
        </div>
        <FormInput
          label="Start Date"
          value={filters.startDate}
          onChange={(value) => setFilters((prev) => ({ ...prev, startDate: value }))}
          type="datetime-local"
        />
        <FormInput
          label="End Date"
          value={filters.endDate}
          onChange={(value) => setFilters((prev) => ({ ...prev, endDate: value }))}
          type="datetime-local"
        />
        <div style={{ margin: "0 10px" }}>
          <label>
            Chart Type: {" "}
            <select
              value={chartType}
              onChange={(e) => setChartType(e.target.value)}
              style={{
                padding: "5px",
                borderRadius: "5px",
                border: "1px solid #ccc",
                width: "150px",
              }}
            >
              <option value="line">Line</option>
              <option value="bar">Bar</option>
            </select>
          </label>
        </div>
        <button
          onClick={() => fetchFilteredData(currentPage)}
          disabled={!selectedSensor}
          style={{
            margin: "0 10px",
            padding: "10px 20px",
            borderRadius: "5px",
            border: "none",
            backgroundColor: selectedSensor ? "#4CAF50" : "#ccc",
            color: "white",
            cursor: selectedSensor ? "pointer" : "not-allowed",
          }}
        >
          Apply Filters
        </button>
        <button
          onClick={handleClearFilters}
          style={{
            margin: "0 10px",
            padding: "10px 20px",
            borderRadius: "5px",
            border: "none",
            backgroundColor: "#f44336",
            color: "white",
            cursor: "pointer",
          }}
        >
          Clear Filters
        </button>
        {validationError && <p style={{ color: "red", fontSize: "14px" }}>{validationError}</p>}
      </div>
      {loading ? (
        <p>Loading...</p>
      ) : chartData ? (
        <div style={{ width: "100%", height: "60vh" }}>
          {chartType === "line" ? (
            <Line data={chartData} options={chartOptions(selectedSensor)} />
          ) : (
            <Bar data={chartData} options={chartOptions(selectedSensor)} />
          )}
        </div>
      ) : (
        <p>No data available.</p>
      )}
      <div style={{ display: "flex", marginTop: "20px" }}>
        <button
          onClick={() => handlePageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          style={{
            margin: "0 10px",
            padding: "10px 20px",
            borderRadius: "5px",
            border: "none",
            backgroundColor: currentPage <= 1 ? "#ccc" : "#2196F3",
            color: "white",
            cursor: currentPage <= 1 ? "not-allowed" : "pointer",
          }}
        >
          Previous
        </button>
        <span style={{ margin: "0 10px" }}>Page {currentPage} of {totalPages}</span>
        <button
          onClick={() => handlePageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          style={{
            margin: "0 10px",
            padding: "10px 20px",
            borderRadius: "5px",
            border: "none",
            backgroundColor: currentPage >= totalPages ? "#ccc" : "#2196F3",
            color: "white",
            cursor: currentPage >= totalPages ? "not-allowed" : "pointer",
          }}
        >
          Next
        </button>
      </div>
    </div>
  );
};

export default HistoryData;
