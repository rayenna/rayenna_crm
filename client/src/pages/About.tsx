import AboutSection from '../components/AboutSection'

const About = () => {
  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="mb-6 animate-slide-up">
        <h1 className="text-5xl font-extrabold bg-gradient-to-r from-primary-600 via-primary-500 via-green-500 to-primary-600 bg-clip-text text-transparent mb-3 drop-shadow-lg">
          About
        </h1>
        <p className="text-gray-600 font-medium">
          Credits, copyright, intellectual property, and confidentiality notice
        </p>
      </div>

      <AboutSection />
    </div>
  )
}

export default About

