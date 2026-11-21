import AwsLogo from "./aws-logo"

export default function NavigationWordmark({ className = "" }: { className?: string }) {
  return (
    <strong className={`alpha-navigation-name ${className}`}>
      <span className="alpha-navigation-organization">
        <span className="alpha-navigation-aws"><AwsLogo /></span>
        <span>Student Builder Group</span>
      </span>
      <span className="sr-only"> - </span>
      <span className="alpha-navigation-chapter">Alpha</span>
    </strong>
  )
}
