import React, { useState } from "react";
import Papa from "papaparse";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from "recharts";

export default function AgentChartsUploader() {
  const [callsData, setCallsData] = useState([]);
  const [percentData, setPercentData] = useState([]);

  const handleUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    Papa.parse(file, {
      header: false,
      skipEmptyLines: true,
      complete: ({ data }) => {
        const rawData = data.slice(2); // Skip headers + 1
        const calls = [];
        const percents = [];

        rawData.forEach(row => {
          const agent = row[1]?.trim();
          const outboundCalls = parseInt(row[3], 10);
          const percentage = parseFloat(row[8]?.replace('%', ''));

          if (!agent || isNaN(outboundCalls) || isNaN(percentage)) return;

          calls.push({ Agent: agent, OutboundCalls: outboundCalls });
          percents.push({ Agent: agent, PercentageAvailable: percentage });
        });

        // Sort
        calls.sort((a, b) => b.OutboundCalls - a.OutboundCalls);
        percents.sort((a, b) => b.PercentageAvailable - a.PercentageAvailable);

        setCallsData(calls);
        setPercentData(percents);
      }
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-tr from-gray-50 via-white to-gray-100 p-6 font-sans">
      <div className="max-w-5xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-8 border border-gray-200">
          <h1 className="text-3xl font-bold text-center text-indigo-600 mb-4">
            📊 Agent Analytics Dashboard
          </h1>
          <p className="text-center text-gray-600 mb-6">
            Upload a CSV file to visualize agent outbound calls and availability.
          </p>
          <div className="flex justify-center">
            <input
              type="file"
              accept=".csv"
              onChange={handleUpload}
              className="file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-indigo-100 file:text-indigo-800 hover:file:bg-indigo-200 transition"
            />
          </div>
        </div>

        {callsData.length > 0 && (
          <div className="bg-white rounded-2xl shadow-lg p-6 mb-10 border border-gray-200">
            <h2 className="text-2xl font-semibold text-center text-gray-800 mb-4">
              🔊 Outbound Calls by Agent
            </h2>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={callsData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="Agent" angle={-45} textAnchor="end" interval={0} height={120} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="OutboundCalls" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {percentData.length > 0 && (
          <div className="bg-white rounded-2xl shadow-lg p-6 mb-10 border border-gray-200">
            <h2 className="text-2xl font-semibold text-center text-gray-800 mb-4">
              🕒 Percentage Available by Agent
            </h2>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={percentData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="Agent" angle={-45} textAnchor="end" interval={0} height={120} />
                <YAxis />
                <Tooltip formatter={(value) => `${value.toFixed(2)}%`} />
                <Bar dataKey="PercentageAvailable" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}
