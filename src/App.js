import React, { useState } from "react";
import Papa from "papaparse";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList
} from "recharts";

export default function AgentChartsUploader() {
  const [callsData, setCallsData] = useState([]);
  const [percentData, setPercentData] = useState([]);
  const [noAnswerData, setNoAnswerData] = useState([]);

  const handleUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    Papa.parse(file, {
      header: false,
      skipEmptyLines: true,
      complete: ({ data }) => {
        const rawData = data.slice(2);
        const calls = [], percents = [], noAnswers = [];

        rawData.forEach(row => {
          const agent = row[1]?.trim();
          const outboundCalls = parseInt(row[3], 10);
          const noAnswer = parseInt(row[4], 10);
          const percentage = parseFloat(row[10]?.replace('%', ''));

          if (!agent) return;

          if (!isNaN(outboundCalls)) calls.push({ Agent: agent, OutboundCalls: outboundCalls });
          if (!isNaN(noAnswer)) noAnswers.push({ Agent: agent, NoAnswers: noAnswer });
          if (!isNaN(percentage)) percents.push({ Agent: agent, PercentageAvailable: percentage });
        });

        setCallsData(calls.sort((a, b) => b.OutboundCalls - a.OutboundCalls));
        setNoAnswerData(noAnswers.sort((a, b) => b.NoAnswers - a.NoAnswers));
        setPercentData(percents.sort((a, b) => b.PercentageAvailable - a.PercentageAvailable));
      }
    });
  };

  return (
    <div className="container">
      <div className="card">
        <h1 className="title">📊 Agent Analytics Dashboard</h1>
        <p className="subtitle">Upload a CSV file to visualize agent performance statistics.</p>
        <div className="upload-input">
          <input type="file" accept=".csv" onChange={handleUpload} />
        </div>
      </div>

      {callsData.length > 0 && (
        <div className="card">
          <h2 className="subtitle">🔊 Outbound Calls by Agent</h2>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={callsData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="Agent" angle={-45} textAnchor="end" interval={0} height={120} />
              <YAxis />
              <Tooltip />
              <Bar dataKey="OutboundCalls" fill="#6366f1">
                <LabelList dataKey="OutboundCalls" position="top" />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {noAnswerData.length > 0 && (
        <div className="card">
          <h2 className="subtitle">📵 No Answers by Agent</h2>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={noAnswerData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="Agent" angle={-45} textAnchor="end" interval={0} height={120} />
              <YAxis />
              <Tooltip />
              <Bar dataKey="NoAnswers" fill="#f97316">
                <LabelList dataKey="NoAnswers" position="top" />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {percentData.length > 0 && (
        <div className="card">
          <h2 className="subtitle">🕒 Percentage Available by Agent</h2>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={percentData} barCategoryGap="2%">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="Agent" angle={-45} textAnchor="end" interval={0} height={120} />
              <YAxis />
              <Tooltip formatter={(value) => `${value.toFixed(2)}%`} />
              <Bar dataKey="PercentageAvailable" fill="#10b981">
              <LabelList
              dataKey="PercentageAvailable"
              position="top"
              formatter={(v) => `${v.toFixed(1)}%`}
              style={{ fontSize: 10, fill: '#555' }}
            />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
