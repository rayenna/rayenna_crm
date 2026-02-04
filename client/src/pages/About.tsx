import AboutSection from '../components/AboutSection'

const About = () => {
  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="mb-6 animate-slide-up border-l-4 border-l-slate-500 pl-4">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
          About
        </h1>
        <p className="text-sm text-slate-600/80 mt-0.5">
          Credits, copyright, intellectual property, and confidentiality notice
        </p>
      </div>

      <AboutSection />
    </div>
  )
}

export default About

