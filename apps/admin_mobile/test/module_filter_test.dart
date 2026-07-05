import 'package:clima_admin_mobile/src/screens/module_filter.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('busca ignora caixa e acentos', () {
    const row = FilterableModuleRow(
      searchText: 'Manutencao Clinica Sao Jose',
      filter: 'aberta',
    );

    expect(row.matches(query: 'MANUTENÇÃO são', selectedFilter: null), isTrue);
  });

  test('combina busca e filtro', () {
    const row = FilterableModuleRow(
      searchText: 'OS Hospital',
      filter: 'concluida',
    );

    expect(row.matches(query: 'hospital', selectedFilter: 'aberta'), isFalse);
    expect(row.matches(query: 'hospital', selectedFilter: 'concluida'), isTrue);
  });
}
