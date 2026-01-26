import AboutSection from '../components/AboutSection'

const About = () => {
  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="mb-6 animate-slide-up">
        <h1 className="text-4xl font-extrabold text-primary-800 mb-3">
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

