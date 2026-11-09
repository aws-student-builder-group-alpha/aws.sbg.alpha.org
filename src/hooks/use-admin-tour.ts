'use client'

import { useEffect, useRef, useCallback } from 'react'
import { driver, type Driver, type DriveStep } from 'driver.js'
import 'driver.js/dist/driver.css'
import { DRIVER_THEME } from '@/lib/admin-tour'

export function useAdminTour(steps: DriveStep[]) {
	const driverRef = useRef<Driver | null>(null)

	useEffect(() => {
		return () => {
			driverRef.current?.destroy()
		}
	}, [])

	const startTour = useCallback(() => {
		driverRef.current?.destroy()

		const visibleSteps = steps.filter((step) => {
			if (!step.element) return true
			const selector =
				typeof step.element === 'string'
					? step.element
					: null
			if (!selector) return true
			return document.querySelector(selector) !== null
		})

		if (visibleSteps.length === 0) return

		const d = driver({
			...DRIVER_THEME,
			steps: visibleSteps,
			onDestroyStarted: () => {
				d.destroy()
			},
		})

		driverRef.current = d
		d.drive()
	}, [steps])

	return { startTour }
}
