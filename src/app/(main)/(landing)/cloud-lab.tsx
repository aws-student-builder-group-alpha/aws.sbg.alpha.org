import Image from "next/image"
import { ArrowUpRight } from "lucide-react"
import "./cloud-lab.css"

const STEPS = [
  { id: "store", title: "Store it.", description: "Upload your event photos to the cloud.", name: "Amazon S3", icon: "s3", url: "https://aws.amazon.com/s3/" },
  { id: "resize", title: "Resize it.", description: "Make a thumbnail when someone uploads a photo.", name: "AWS Lambda", icon: "lambda", url: "https://aws.amazon.com/lambda/" },
  { id: "tag", title: "Tag it.", description: "Save tags so friends can find their photos.", name: "Amazon DynamoDB", icon: "dynamodb", url: "https://aws.amazon.com/dynamodb/" },
  { id: "share", title: "Share it.", description: "Put the gallery online and share the link.", name: "Amazon EC2", icon: "ec2", url: "https://aws.amazon.com/ec2/" },
] as const

export default function CloudLab() {
  return <div className="alpha-cloud-lab">
    {STEPS.map(step => <section key={step.id} className="alpha-cloud-chapter" data-step={step.id} aria-labelledby={`alpha-cloud-${step.id}`}>
      <div className="alpha-cloud-art" aria-hidden="true">
        <div className="alpha-cloud-print">
          <Image src="/optimized/gallery/full/scd-2026-audience.webp" alt="" fill sizes="(min-width: 800px) 34vw, 78vw" />
          {step.id === "tag" && <span className="alpha-cloud-photo-tag">Student Community Day</span>}
        </div>
        {step.id === "share" && <div className="alpha-cloud-contact-sheet">
          <div><Image src="/optimized/gallery/full/scd-2026-team.webp" alt="" fill sizes="(min-width: 800px) 17vw, 39vw" /></div>
          <div><Image src="/optimized/gallery/full/scd-2026-certificates.webp" alt="" fill sizes="(min-width: 800px) 17vw, 39vw" /></div>
        </div>}
      </div>
      <div className="alpha-cloud-caption">
        <h3 id={`alpha-cloud-${step.id}`}>{step.title}</h3>
        <p>{step.description}</p>
        <a className="alpha-cloud-service-link" href={step.url}>
          <Image className="alpha-cloud-service-icon" src={`/aws-services/${step.icon}.png`} width={40} height={40} alt="" />
          <span>{step.name}</span><ArrowUpRight size={15} aria-hidden="true" />
        </a>
      </div>
    </section>)}
  </div>
}
