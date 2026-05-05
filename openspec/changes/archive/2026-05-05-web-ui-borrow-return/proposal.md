# Web UI Borrow & Return Coverage

**Status:** ✅ Completed  
**Date:** 2026-05-05  
**Original file:** `docs/plans/2026-05-05-web-ui-borrow-return.md`

## Summary

Quick plan to achieve parity between Telegram commands and web UI actions. The web `/my-borrows` page needed to support borrowing, returning, and drop-point info — covering the same actions as `/pinjam`, `/kembali`, and `/drop` Telegram commands.

## What was done

1. Added borrow request form to `/my-borrows` page (select book, duration)
2. Added "Kembalikan" button on active borrows
3. Created `/drop-info` page with drop point locations
4. Added nav link to drop-info in authenticated layout
5. Extended public agent gateway with full borrow lifecycle (my_borrows, incoming_borrow_requests, approve_borrow, reject_borrow, return_book)

## Outcome

Web UI now covers all Telegram command actions. Users can borrow, approve/reject, return, and view drop points from the web interface.
