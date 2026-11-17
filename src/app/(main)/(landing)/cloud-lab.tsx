"use client"

import { useState } from "react"
import Image from "next/image"
import { ArrowUpRight, Check } from "lucide-react"
import "./cloud-lab.css"

const SERVICES = [
  { id: "s3", name: "Amazon S3", category: "Storage", title: "Give your files a home.", description: "Store the photos, uploads, and assets behind your next project.", url: "https://aws.amazon.com/s3/", color: "#9dcc45" },
  { id: "lambda", name: "AWS Lambda", category: "Serverless", title: "Turn an event into action.", description: "Run your code when something happens, without managing servers.", url: "https://aws.amazon.com/lambda/", color: "#ffac58" },
  { id: "ec2", name: "Amazon EC2", category: "Compute", title: "Launch your first server.", description: "Run an application on a virtual machine in the cloud.", url: "https://aws.amazon.com/ec2/", color: "#ffac58" },
  { id: "dynamodb", name: "Amazon DynamoDB", category: "Database", title: "Put your app’s data to work.", description: "Store and retrieve your application’s data in a managed NoSQL database.", url: "https://aws.amazon.com/dynamodb/", color: "#d7a2ff" },
] as const

export default function CloudLab() {
  const [selected, setSelected] = useState<string>("s3")
  const service = SERVICES.find(item => item.id === selected) ?? SERVICES[0]
  return <div className="alpha-cloud-lab">
    <div className="alpha-cloud-lab-header"><span>YOUR CLOUD TOOLKIT</span><Image src="/aws-logo-white.png" width={118} height={70} alt="AWS" /></div>
    <div className="alpha-cloud-services" role="group" aria-label="Explore AWS services">
      {SERVICES.map(item => <button key={item.id} type="button" className="alpha-cloud-service" aria-pressed={selected === item.id} aria-controls="alpha-cloud-detail" onClick={() => setSelected(item.id)}>
        <Image src={`/aws-services/${item.id}.png`} width={64} height={64} alt="" />
        <span><small>{item.category}</small><strong>{item.name}</strong></span>
        {selected === item.id && <Check className="alpha-cloud-selected" size={15} aria-hidden="true" />}
      </button>)}
    </div>
    <div id="alpha-cloud-detail" className="alpha-cloud-detail" aria-live="polite" aria-atomic="true">
      <span className="alpha-cloud-detail-label" style={{ color: service.color }}>{service.category} / {service.name}</span>
      <h3>{service.title}</h3><p>{service.description}</p>
      <a href={service.url}>Explore {service.name}<ArrowUpRight size={16} aria-hidden="true" /></a>
    </div>
    <a className="alpha-cloud-icon-credit" href="https://aws.amazon.com/architecture/icons/">AWS Architecture Icons</a>
  </div>
}
