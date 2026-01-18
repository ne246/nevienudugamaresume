import "./global.css"

export const metadata = {
  title: "Nevien Udugama Resume",
  description: "Nevien Udugama AI Resume Chatbot",
}

const RootLayout = ({ children }) => {
  return (
    <html lang="en">
        <body>{children}</body>
    </html>
  )
}

export default RootLayout