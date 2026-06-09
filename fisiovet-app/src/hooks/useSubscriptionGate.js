// src/hooks/useSubscriptionGate.js
import { useCallback, useMemo, useState } from "react";
import { useSelector } from "react-redux";

import {
	selectSubscriptionEnabled,
	selectCurrentPlan,
	selectCurrentLimits,
} from "@/src/store/slices/subscriptionSlice";

import {
	getLimitStatus,
	getUsageFromState,
} from "@/src/utils/subscriptionLimits";

export function useSubscriptionGate() {
	const enabled = useSelector(selectSubscriptionEnabled);
	const plan = useSelector(selectCurrentPlan);
	const limits = useSelector(selectCurrentLimits);
	const state = useSelector((s) => s);

	const [limitModal, setLimitModal] = useState({
		visible: false,
		resource: null,
		current: 0,
		limit: 0,
	});

	const usage = useMemo(() => getUsageFromState(state), [state]);

	const checkLimit = useCallback(
		(resource) => {
			const result = getLimitStatus({
				enabled,
				plan,
				limits,
				usage,
				resource,
			});

			if (!result.allowed) {
				setLimitModal({
					visible: true,
					resource,
					current: result.current,
					limit: result.limit,
				});

				return false;
			}

			return true;
		},
		[enabled, plan, limits, usage]
	);

	const closeLimitModal = useCallback(() => {
		setLimitModal((prev) => ({
			...prev,
			visible: false,
		}));
	}, []);

	return {
		enabled,
		plan,
		limits,
		usage,
		checkLimit,
		limitModal,
		closeLimitModal,
	};
}