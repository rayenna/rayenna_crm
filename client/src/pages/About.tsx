import AboutSection from '../components/AboutSection'
import PageCard from '../components/PageCard'

const AboutInfoIcon = () => (
  <svg className="w-5 h-5 text-white drop-shadow-sm" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
    <path fillRule="evenodd" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" clipRule="evenodd" />
  </svg>
)

const About = () => {
  return (
    <div className="px-0 py-6 sm:px-0">
      <PageCard
        title="About"
        subtitle="Credits, copyright, intellectual property, and confidentiality notice"
        icon={<AboutInfoIcon />}
        className="max-w-full"
      >
        <AboutSection embedded />
      </PageCard>
    </div>
  )
}

export default About

