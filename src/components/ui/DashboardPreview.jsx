import React from "react";

export default function DashboardPreview() {
  return (
    <div className="bg-gray-50 h-full p-4 overflow-auto">
      {/* Sidebar */}
      <div className="flex h-full">
        <div className="w-48 bg-white rounded-lg shadow-sm p-3 mr-4 flex-shrink-0">
          {/* Logo */}
          <div className="flex items-center gap-2 mb-4">
            <div className="w-6 h-6 bg-blue-600 rounded flex items-center justify-center">
              <span className="text-white font-bold text-sm">+</span>
            </div>
            <span className="font-semibold text-gray-900 text-sm">Alytics</span>
          </div>

          {/* Search */}
          <div className="mb-4">
            <div className="relative">
              <input
                type="text"
                placeholder="Search"
                className="w-full pl-8 pr-3 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <svg
                className="absolute left-2 top-1.5 w-3 h-3 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
          </div>

          {/* Menu */}
          <nav className="space-y-0.5">
            {[
              { icon: "📊", label: "Dashboard" },
              { icon: "👥", label: "Customers", hasArrow: true },
              { icon: "📄", label: "All reports" },
              { icon: "🌍", label: "Geography" },
              { icon: "💬", label: "Conversations" },
              { icon: "🏷️", label: "Deals" },
              { icon: "📤", label: "Export" },
            ].map((item, idx) => (
              <div
                key={idx}
                className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-100 cursor-pointer text-xs text-gray-700"
              >
                <span className="text-xs">{item.icon}</span>
                <span className="flex-1 truncate">{item.label}</span>
                {item.hasArrow && (
                  <svg
                    className="w-3 h-3 flex-shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                )}
              </div>
            ))}
          </nav>
        </div>

        {/* Main Content */}
        <div className="flex-1 grid grid-cols-2 gap-3 overflow-auto">
          {/* Revenues Card */}
          <div className="bg-white rounded-lg shadow-sm p-4">
            <h3 className="text-xs font-medium text-gray-600 mb-2">Revenues</h3>
            <div className="flex items-baseline gap-2 mb-1">
              <span className="text-2xl font-bold text-gray-900">15%</span>
              <svg
                className="w-4 h-4 text-blue-600"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <p className="text-xs text-gray-500 mb-3">
              Increase compared to last week
            </p>
            <a href="#" className="text-xs text-blue-600 font-medium">
              Revenues report →
            </a>
          </div>

          {/* Lost Deals Card */}
          <div className="bg-white rounded-lg shadow-sm p-4">
            <h3 className="text-xs font-medium text-gray-600 mb-2">
              Lost deals
            </h3>
            <div className="mb-1">
              <span className="text-2xl font-bold text-gray-900">4%</span>
            </div>
            <p className="text-xs text-gray-500 mb-3">
              You closed 96 out of 100 deals
            </p>
            <a href="#" className="text-xs text-blue-600 font-medium">
              All deals →
            </a>
          </div>

          {/* Quarter Goal Card */}
          <div className="bg-white rounded-lg shadow-sm p-4">
            <h3 className="text-xs font-medium text-gray-600 mb-3">
              Quarter goal
            </h3>
            <div className="relative w-24 h-24 mx-auto mb-3">
              <svg className="transform -rotate-90 w-24 h-24">
                <circle
                  cx="48"
                  cy="48"
                  r="42"
                  stroke="#e5e7eb"
                  strokeWidth="8"
                  fill="none"
                />
                <circle
                  cx="48"
                  cy="48"
                  r="42"
                  stroke="#3b82f6"
                  strokeWidth="8"
                  fill="none"
                  strokeDasharray={`${2 * Math.PI * 42 * 0.84} ${
                    2 * Math.PI * 42
                  }`}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-lg font-bold text-gray-900">84%</span>
              </div>
            </div>
            <a
              href="#"
              className="text-xs text-blue-600 font-medium block text-center"
            >
              All goals →
            </a>
          </div>

          {/* Customers Card */}
          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-medium text-gray-600">Customers</h3>
              <div className="flex items-center gap-1 text-[10px] text-gray-500 cursor-pointer">
                <span>Sort by Newest</span>
                <svg
                  className="w-2.5 h-2.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </div>
            </div>
            <div className="space-y-2">
              {[
                { name: "Chris Friedkly", company: "Supermarket Villanova" },
                {
                  name: "Maggie Johnson",
                  company: "Oasis Organic Inc.",
                  active: true,
                },
                { name: "Gael Harry", company: "New York Finest Fruits" },
              ].map((customer, idx) => (
                <div
                  key={idx}
                  className={`flex items-center gap-2 p-2 rounded-lg ${
                    customer.active ? "bg-blue-50" : ""
                  }`}
                >
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold text-xs flex-shrink-0">
                    {customer.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-900 truncate">
                      {customer.name}
                    </p>
                    <p className="text-[10px] text-gray-500 truncate">
                      {customer.company}
                    </p>
                  </div>
                  {customer.active && (
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button className="w-5 h-5 flex items-center justify-center hover:bg-blue-100 rounded text-[10px]">
                        💬
                      </button>
                      <button className="w-5 h-5 flex items-center justify-center hover:bg-blue-100 rounded text-[10px]">
                        ⭐
                      </button>
                      <button className="w-5 h-5 flex items-center justify-center hover:bg-blue-100 rounded text-[10px]">
                        ✏️
                      </button>
                      <button className="w-5 h-5 flex items-center justify-center hover:bg-blue-100 rounded text-[10px]">
                        ⋮
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Growth Chart Card */}
          <div className="col-span-2 bg-white rounded-lg shadow-sm p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-medium text-gray-600">Growth</h3>
              <div className="flex items-center gap-1 text-[10px] text-gray-500 cursor-pointer">
                <span>Yearly</span>
                <svg
                  className="w-2.5 h-2.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </div>
            </div>
            <div className="h-32 relative">
              <svg className="w-full h-full" viewBox="0 0 400 200">
                {/* Y-axis labels */}
                <text x="10" y="20" className="text-xs fill-gray-400">
                  100k
                </text>
                <text x="10" y="60" className="text-xs fill-gray-400">
                  50k
                </text>
                <text x="10" y="100" className="text-xs fill-gray-400">
                  20k
                </text>
                <text x="10" y="140" className="text-xs fill-gray-400">
                  10k
                </text>
                <text x="10" y="180" className="text-xs fill-gray-400">
                  0
                </text>

                {/* Grid lines */}
                {[0, 50, 100, 150, 200].map((y) => (
                  <line
                    key={y}
                    x1="40"
                    y1={y + 20}
                    x2="380"
                    y2={y + 20}
                    stroke="#e5e7eb"
                    strokeWidth="1"
                  />
                ))}

                {/* Line graph */}
                <polyline
                  points="60,160 100,140 140,120 180,100 220,80 260,70 300,60 340,50"
                  fill="none"
                  stroke="#3b82f6"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                {/* Data points */}
                {[
                  { x: 60, y: 160 },
                  { x: 100, y: 140 },
                  { x: 140, y: 120 },
                  { x: 180, y: 100 },
                  { x: 220, y: 80 },
                  { x: 260, y: 70 },
                  { x: 300, y: 60 },
                  { x: 340, y: 50 },
                ].map((point, idx) => (
                  <circle
                    key={idx}
                    cx={point.x}
                    cy={point.y}
                    r="4"
                    fill="#3b82f6"
                  />
                ))}

                {/* X-axis labels */}
                {[
                  "2016",
                  "2017",
                  "2018",
                  "2019",
                  "2020",
                  "2021",
                  "2022",
                  "2023",
                ].map((year, idx) => (
                  <text
                    key={year}
                    x={60 + idx * 40}
                    y="195"
                    className="text-xs fill-gray-400"
                    textAnchor="middle"
                  >
                    {year}
                  </text>
                ))}
              </svg>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
