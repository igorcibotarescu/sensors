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
      {label}:{" "}
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
  const [totalPages, setTotalPages] = useState(0); // Initialize with 0

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
    const { startDate, endDate } = filters;

    if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
      setValidationError("Start date must be before or equal to the end date.");
      return;
    }

    setValidationError("");

    if (!selectedSensor) {
      setSensorData([]);
      setTotalPages(0); // No pages available
      return;
    }

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

      setSensorData(response.data);
      const totalRecords = response.total || 0;
      setTotalPages(Math.ceil(totalRecords / pageSize)); // Update pages based on records
    } catch (err) {
      console.log("Failed to fetch sensor data. Please try again later.");
      setTotalPages(0); // Error case, reset pages
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
          groupedData[param.name] = { data: [], timestamps: [], unit: param.units || "" };
        }
        groupedData[param.name].data.push(param.value);
        groupedData[param.name].timestamps.push(timestamp);
      });
    });

    const datasets = Object.entries(groupedData).map(
      ([name, { data, unit }], index) => ({
        label: `${name} (${unit})`,
        data,
        borderColor: colors[index % colors.length],
        backgroundColor: `${colors[index % colors.length]}33`,
        tension: 0.4,
        pointRadius: 3,
      })
    );

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
    setCurrentPage(1);
    setTotalPages(0); // Reset to 0 pages
  };

  const handlePageChange = (newPage) => {
    if (newPage > 0 && newPage <= totalPages) {
      setCurrentPage(newPage);
      fetchFilteredData(newPage);
    }
  };

  const exportAsJSON = () => {
    const json = JSON.stringify(sensorData, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `sensor_data_${Date.now()}.json`;
    link.click();
  };

  const exportAsImage = () => {
    const chartCanvas = document.querySelector("canvas");
    if (chartCanvas) {
      const url = chartCanvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.href = url;
      link.download = `sensor_chart_${Date.now()}.png`;
      link.click();
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
            Sensor:{" "}
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
            Chart Type:{" "}
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
        {totalPages > 0 ? (
          <>
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
            <span style={{ margin: "0 10px" }}>
              Page {currentPage} of {totalPages}
            </span>
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
          </>
        ) : (
          <span style={{ margin: "0 10px", color: "#888" }}>No pages available</span>
        )}
      </div>
      <div style={{ marginTop: "10px" }}>
        <button
          onClick={exportAsJSON}
          style={{
            margin: "0 10px",
            padding: "10px 20px",
            borderRadius: "5px",
            border: "none",
            backgroundColor: "#2196F3",
            color: "white",
            cursor: "pointer",
          }}
        >
          Export as JSON
        </button>
        <button
          onClick={exportAsImage}
          style={{
            margin: "0 10px",
            padding: "10px 20px",
            borderRadius: "5px",
            border: "none",
            backgroundColor: "#4CAF50",
            color: "white",
            cursor: "pointer",
          }}
        >
          Export as Image
        </button>
      </div>
    </div>
  );
};

export default HistoryData;
