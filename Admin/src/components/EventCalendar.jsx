// components/EventCalendar.jsx
import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Filter, X } from 'lucide-react';

export default function EventCalendar({ events = [], selectedDate, onSelectDate, isDarkMode = false }) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const firstDayIndex = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  // Helper to format date in Philippine Standard Time (PST/PHT: UTC+8)
  const getPHTDateKey = (raw) => {
    if (!raw) return null;
    try {
      const d = new Date(raw);
      if (isNaN(d.getTime())) return null;
      const formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Manila',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      });
      return formatter.format(d); // "YYYY-MM-DD"
    } catch {
      return null;
    }
  };

  const getPHTTodayKey = () => {
    try {
      const formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Manila',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      });
      return formatter.format(new Date());
    } catch {
      return new Date().toISOString().slice(0, 10);
    }
  };

  const todayKey = getPHTTodayKey();

  const eventDatesMap = {};
  events.forEach((evt) => {
    const rawDate = evt.event_date || evt.scheduled_date || evt.event_datetime || evt.date || (evt.category === 'Events' ? evt.created_at : null);
    const key = getPHTDateKey(rawDate);
    if (key) {
      if (!eventDatesMap[key]) eventDatesMap[key] = [];
      eventDatesMap[key].push(evt);
    }
  });

  const days = [];
  for (let i = firstDayIndex - 1; i >= 0; i--) {
    days.push({ day: daysInPrevMonth - i, isCurrentMonth: false, dateKey: null });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const key = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    days.push({ day: d, isCurrentMonth: true, dateKey: key, events: eventDatesMap[key] || [] });
  }
  const remaining = 42 - days.length;
  for (let i = 1; i <= remaining; i++) {
    days.push({ day: i, isCurrentMonth: false, dateKey: null });
  }

  return (
    <div className="bg-white rounded-[26px] border border-slate-100/80 p-5 shadow-xs space-y-4 text-slate-800">
      {/* Calendar Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-xl bg-sky-50 text-[#38bdf8] flex items-center justify-center">
            <CalendarIcon className="w-4 h-4" />
          </div>
          <h3 className="font-extrabold text-sm text-slate-800">
            {monthNames[month]} {year}
          </h3>
        </div>
        <div className="flex items-center space-x-1.5">
          <button
            type="button"
            onClick={prevMonth}
            className="w-7 h-7 rounded-xl bg-[#f4f7fb] text-slate-500 hover:text-[#3b5bfd] hover:bg-blue-50 flex items-center justify-center transition-colors cursor-pointer"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={nextMonth}
            className="w-7 h-7 rounded-xl bg-[#f4f7fb] text-slate-500 hover:text-[#3b5bfd] hover:bg-blue-50 flex items-center justify-center transition-colors cursor-pointer"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Weekday Labels */}
      <div className="grid grid-cols-7 text-center text-[10px] font-extrabold uppercase tracking-wider text-slate-400 border-b border-slate-100 pb-2">
        <span>Su</span>
        <span>Mo</span>
        <span>Tu</span>
        <span>We</span>
        <span>Th</span>
        <span>Fr</span>
        <span>Sa</span>
      </div>

      {/* Grid of Days */}
      <div className="grid grid-cols-7 gap-1 text-center text-xs">
        {days.map((item, idx) => {
          if (!item.isCurrentMonth) {
            return (
              <div
                key={idx}
                className="py-2 pointer-events-none text-[11px] text-slate-300"
              >
                {item.day}
              </div>
            );
          }

          const hasEvents = item.events && item.events.length > 0;
          const isToday = item.dateKey === todayKey;
          const isSelected = selectedDate === item.dateKey;
          const isPast = item.dateKey ? item.dateKey < todayKey : false;

          return (
            <button
              key={idx}
              type="button"
              disabled={isPast}
              onClick={() => {
                if (!isPast) {
                  onSelectDate(isSelected ? null : item.dateKey);
                }
              }}
              title={
                isPast
                  ? 'Past date (non-selectable)'
                  : hasEvents
                  ? `${item.events.length} event(s) scheduled`
                  : ''
              }
              className={`py-2 rounded-full flex flex-col items-center justify-center relative transition-all ${
                isPast
                  ? 'opacity-30 cursor-not-allowed text-slate-300 select-none'
                  : isSelected
                  ? 'bg-gradient-to-b from-[#4dc4ff] to-[#3b5bfd] text-white font-extrabold shadow-md shadow-sky-400/35 cursor-pointer'
                  : isToday
                  ? 'bg-sky-50 text-[#3b5bfd] font-extrabold border border-sky-200 cursor-pointer'
                  : hasEvents
                  ? 'bg-blue-50/80 hover:bg-blue-100 text-[#3b5bfd] font-extrabold cursor-pointer'
                  : 'text-slate-600 hover:bg-[#f4f7fb] font-medium cursor-pointer'
              }`}
            >
              <span>{item.day}</span>
              {hasEvents && !isPast && (
                <span
                  className={`w-1.5 h-1.5 rounded-full mt-0.5 ${
                    isSelected ? 'bg-white' : 'bg-[#38bdf8]'
                  }`}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Active Filter Status */}
      {selectedDate ? (
        <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
          <span className="font-bold flex items-center text-[#3b5bfd]">
            <Filter className="w-3.5 h-3.5 mr-1 text-[#38bdf8]" /> Filtered:{' '}
            <span className="font-mono ml-1 font-extrabold">{selectedDate}</span>
          </span>
          <button
            type="button"
            onClick={() => onSelectDate(null)}
            className="text-slate-400 hover:text-rose-600 font-bold flex items-center space-x-0.5 text-[11px] cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
            <span>Clear</span>
          </button>
        </div>
      ) : (
        <div className="pt-2 border-t border-slate-100 text-center text-[11px] text-slate-400">
          <span className="inline-block w-2 h-2 rounded-full bg-[#38bdf8] mr-1.5" />
          Highlighted days indicate scheduled barangay events &amp; bulletins.
        </div>
      )}
    </div>
  );
}
