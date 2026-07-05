class OnboardingRequiredException implements Exception {
  const OnboardingRequiredException({
    required this.onboardingToken,
    required this.technicianName,
  });

  final String onboardingToken;
  final String technicianName;
}
