"use client"

import { useEffect, useState } from "react"
import { ArrowLeft, ArrowRight } from "lucide-react"

const testimonials = [
  { quote: "I love the collaborative learning environment. The workshops are well-structured and the mentors are very approachable.", author: "David Aldreen Marquez" },
  { quote: "Joining the club was the best decision! I've learned so much about cloud computing and the community has been incredibly supportive throughout my journey.", author: "Emmanuel Fabella" },
  { quote: "Joining the club was a great decision! The hands-on projects and supportive community have been amazing. The community are incredibly knowledgeable and always willing to help us grow.", author: "Jogiofernesto Ardales" },
]

export default function TestimonialSwitcher() {
  const [current, setCurrent] = useState(0)
  const [hovered, setHovered] = useState(false)
  const [focused, setFocused] = useState(false)
  const testimonial = testimonials[current]

  useEffect(() => {
    if (hovered || focused) return
    const timer = window.setTimeout(() => setCurrent((index) => (index + 1) % testimonials.length), 4000)
    return () => window.clearTimeout(timer)
  }, [current, hovered, focused])

  return <div className="alpha-testimonial" onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)} onFocus={() => setFocused(true)} onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false) }}>
    <div className="alpha-testimonial-quotes">
      {testimonials.map((item) => <figure className="alpha-quote alpha-quote-measure" aria-hidden="true" key={item.author}>
        <blockquote>“{item.quote}”</blockquote>
        <figcaption>{item.author}<span>BS Information Technology, Rizal Technological University</span></figcaption>
      </figure>)}
      <figure className="alpha-quote" aria-live={focused ? "polite" : "off"} aria-atomic="true">
        <blockquote>“{testimonial.quote}”</blockquote>
        <figcaption>{testimonial.author}<span>BS Information Technology, Rizal Technological University</span></figcaption>
      </figure>
    </div>
    <div className="alpha-testimonial-controls" aria-label="Testimonial navigation">
      <button type="button" aria-label="Previous testimonial" onClick={() => setCurrent((current + testimonials.length - 1) % testimonials.length)}><ArrowLeft size={18} aria-hidden="true" /></button>
      <span aria-hidden="true">{current + 1} / {testimonials.length}</span>
      <button type="button" aria-label="Next testimonial" onClick={() => setCurrent((current + 1) % testimonials.length)}><ArrowRight size={18} aria-hidden="true" /></button>
    </div>
  </div>
}
