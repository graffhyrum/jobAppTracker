export function camelCaseToSpaceSeparatedLower(
	camelCaseString: string,
): string {
	return camelCaseString.replaceAll(/([A-Z])/g, " $1").toLowerCase();
}

// expected 'interestRating' -> 'Interest Rating'
export function camelCaseToSpaceSeparatedUpper(
	camelCaseString: string,
): string {
	if (!camelCaseString) return "";
	const spaced = camelCaseString.replaceAll(/([A-Z])/g, " $1");
	return spaced
		.trim()
		.split(/\s+/)
		.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
		.join(" ");
}

export function camelCaseToHyphenated(camelCaseString: string): string {
	return camelCaseString.replaceAll(/([A-Z])/g, "-$1").toLowerCase();
}
