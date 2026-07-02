import 'dart:async';

import 'package:flutter/material.dart';

import '../../core/formatters.dart';
import '../theme.dart';

/// Option shown by [AsyncSelectField].
class AsyncSelectOption<T> {
  const AsyncSelectOption({
    required this.value,
    required this.label,
    this.sublabel,
  });

  final T value;
  final String label;
  final String? sublabel;
}

/// Search-as-you-type select backed by a callback (web `AsyncSelect`
/// parity). Used for the freelancer directory (with an optional
/// "Invite {email}" affordance) and payroll employee pickers.
class AsyncSelectField<T> extends StatefulWidget {
  const AsyncSelectField({
    super.key,
    required this.label,
    this.hint,
    required this.onSearch,
    required this.onSelected,
    this.selectedLabel,
    this.onClear,
    this.allowEmailInvite = false,
    this.onEmailInvite,
    this.emptyText = 'No results',
  });

  final String label;
  final String? hint;

  /// Loads options for the current query (debounced).
  final Future<List<AsyncSelectOption<T>>> Function(String query) onSearch;

  final ValueChanged<AsyncSelectOption<T>> onSelected;

  /// When set, the field shows the selection with a clear affordance
  /// instead of the search box.
  final String? selectedLabel;
  final VoidCallback? onClear;

  /// When true and the query is a valid email with no exact match, an
  /// "Invite {email}" option is appended.
  final bool allowEmailInvite;
  final ValueChanged<String>? onEmailInvite;

  final String emptyText;

  @override
  State<AsyncSelectField<T>> createState() => _AsyncSelectFieldState<T>();
}

class _AsyncSelectFieldState<T> extends State<AsyncSelectField<T>> {
  final _controller = TextEditingController();
  Timer? _debounce;
  List<AsyncSelectOption<T>> _options = const [];
  bool _loading = false;
  bool _searched = false;

  @override
  void dispose() {
    _debounce?.cancel();
    _controller.dispose();
    super.dispose();
  }

  void _onChanged(String query) {
    _debounce?.cancel();
    _debounce = Timer(const Duration(milliseconds: 300), () => _search(query));
  }

  Future<void> _search(String query) async {
    final trimmed = query.trim();
    if (trimmed.isEmpty) {
      setState(() {
        _options = const [];
        _searched = false;
        _loading = false;
      });
      return;
    }
    setState(() => _loading = true);
    try {
      final options = await widget.onSearch(trimmed);
      if (!mounted || _controller.text.trim() != trimmed) return;
      setState(() {
        _options = options;
        _searched = true;
        _loading = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _options = const [];
        _searched = true;
        _loading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final colors = AppColors.of(context);
    if (widget.selectedLabel != null) {
      return InputDecorator(
        decoration: InputDecoration(labelText: widget.label),
        child: Row(
          children: [
            Expanded(
              child: Text(
                widget.selectedLabel!,
                style: TextStyle(fontSize: 14, color: colors.text),
                overflow: TextOverflow.ellipsis,
              ),
            ),
            if (widget.onClear != null)
              InkWell(
                onTap: widget.onClear,
                child: Icon(Icons.close, size: 18, color: colors.textMuted),
              ),
          ],
        ),
      );
    }

    final query = _controller.text.trim();
    final canInvite =
        widget.allowEmailInvite &&
        emailRegExp.hasMatch(query) &&
        !_options.any((o) => o.label.contains(query));

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        TextField(
          controller: _controller,
          onChanged: _onChanged,
          autocorrect: false,
          decoration: InputDecoration(
            labelText: widget.label,
            hintText: widget.hint,
            suffixIcon: _loading
                ? const Padding(
                    padding: EdgeInsets.all(12),
                    child: SizedBox(
                      width: 16,
                      height: 16,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    ),
                  )
                : const Icon(Icons.search, size: 20),
          ),
        ),
        if (_searched && (_options.isNotEmpty || canInvite || !_loading)) ...[
          const SizedBox(height: 6),
          Container(
            decoration: BoxDecoration(
              color: colors.surface,
              borderRadius: BorderRadius.circular(AppTheme.radiusControl),
              border: Border.all(color: colors.border),
            ),
            child: Column(
              children: [
                for (final option in _options)
                  ListTile(
                    dense: true,
                    title: Text(
                      option.label,
                      style: TextStyle(fontSize: 14, color: colors.text),
                    ),
                    subtitle: option.sublabel == null
                        ? null
                        : Text(
                            option.sublabel!,
                            style: TextStyle(
                              fontSize: 12,
                              color: colors.textMuted,
                            ),
                          ),
                    onTap: () {
                      widget.onSelected(option);
                      _controller.clear();
                      setState(() {
                        _options = const [];
                        _searched = false;
                      });
                    },
                  ),
                if (canInvite)
                  ListTile(
                    dense: true,
                    leading: Icon(
                      Icons.mail_outline,
                      size: 18,
                      color: colors.primary,
                    ),
                    title: Text(
                      'Invite $query',
                      style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w600,
                        color: colors.primary,
                      ),
                    ),
                    onTap: () {
                      widget.onEmailInvite?.call(query);
                      _controller.clear();
                      setState(() {
                        _options = const [];
                        _searched = false;
                      });
                    },
                  ),
                if (_options.isEmpty && !canInvite)
                  Padding(
                    padding: const EdgeInsets.all(12),
                    child: Text(
                      widget.emptyText,
                      style: TextStyle(fontSize: 13, color: colors.textMuted),
                    ),
                  ),
              ],
            ),
          ),
        ],
      ],
    );
  }
}
