import React from 'react'

export default function Layout({ children }) {
  return (
    <div className="min-h-screen">
      <div className="container-page">{children}</div>
    </div>
  )
}


