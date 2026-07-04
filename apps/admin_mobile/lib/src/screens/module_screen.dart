import 'package:flutter/material.dart';

import '../theme/admin_theme.dart';
import 'dashboard_screen.dart';

class ModuleScreen extends StatelessWidget {
  const ModuleScreen({super.key, required this.item});

  final DashboardItem item;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(item.title)),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.all(18),
          children: [
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: item.color,
                borderRadius: BorderRadius.circular(20),
              ),
              child: Row(
                children: [
                  Icon(item.icon, color: Colors.white, size: 40),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          item.title,
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 28,
                            fontWeight: FontWeight.w900,
                          ),
                        ),
                        const SizedBox(height: 6),
                        Text(
                          item.subtitle,
                          style: const TextStyle(
                            color: Color(0xFFF3F7FB),
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 18),
            _ActionTile(
              icon: Icons.visibility_outlined,
              title: 'Ver resumo',
              subtitle: 'Lista real entra na Fase 2.',
              color: item.color,
            ),
            _ActionTile(
              icon: Icons.add_circle_outline,
              title: 'Acao rapida',
              subtitle: 'Criacao e edicao entram na Fase 3.',
              color: item.color,
            ),
            _ActionTile(
              icon: Icons.filter_alt_outlined,
              title: 'Filtros',
              subtitle: 'Busca e filtros entram no acabamento.',
              color: item.color,
            ),
          ],
        ),
      ),
    );
  }
}

class _ActionTile extends StatelessWidget {
  const _ActionTile({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.color,
  });

  final IconData icon;
  final String title;
  final String subtitle;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: adminBorder),
      ),
      child: ListTile(
        leading: Icon(icon, color: color),
        title: Text(
          title,
          style: const TextStyle(fontWeight: FontWeight.w800),
        ),
        subtitle: Text(subtitle),
        trailing: const Icon(Icons.chevron_right),
        onTap: () {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('$title sera implementado na proxima fase.')),
          );
        },
      ),
    );
  }
}
