import 'package:flutter/material.dart';

enum AdminModuleKind {
  orders,
  schedule,
  clients,
  pmoc,
  fleet,
  reports,
  technicians,
  pending,
}

class DashboardItem {
  const DashboardItem(this.kind, this.title, this.subtitle, this.icon, this.color);

  final AdminModuleKind kind;
  final String title;
  final String subtitle;
  final IconData icon;
  final Color color;
}
