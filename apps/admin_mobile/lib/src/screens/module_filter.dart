class FilterableModuleRow {
  const FilterableModuleRow({required this.searchText, this.filter});

  final String searchText;
  final String? filter;

  bool matches({required String query, required String? selectedFilter}) {
    final normalizedQuery = normalizeSearchText(query);
    final queryMatches =
        normalizedQuery.isEmpty ||
        normalizeSearchText(searchText).contains(normalizedQuery);
    final filterMatches = selectedFilter == null || selectedFilter == filter;
    return queryMatches && filterMatches;
  }
}

String normalizeSearchText(String value) {
  const source = 'abcdefghijklmnopqrstuvwxyzàáâãäçèéêëìíîïñòóôõöùúûü';
  const target = 'abcdefghijklmnopqrstuvwxyzaaaaaceeeeiiiinooooouuuu';
  final lower = value.toLowerCase().trim();
  final normalized = lower.split('').map((char) {
    final index = source.indexOf(char);
    return index < 0 ? char : target[index];
  }).join();
  return normalized.replaceAll(RegExp(r'\s+'), ' ');
}
