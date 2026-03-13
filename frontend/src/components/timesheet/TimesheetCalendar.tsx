import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

const localizer = momentLocalizer(moment);

export function TimesheetCalendar({ events, currentView, setCurrentView, currentDate, setCurrentDate, onSelectSlot, onSelectEvent }: any) {
    const CustomToolbar = (toolbar: any) => {
        const goToBack = () => {
            toolbar.onNavigate('PREV');
        };

        const goToNext = () => {
            toolbar.onNavigate('NEXT');
        };

        const goToToday = () => {
            toolbar.onNavigate('TODAY');
        };

        return (
            <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="icon" onClick={goToBack}><ChevronLeft className="h-4 w-4" /></Button>
                    <Button variant="outline" size="sm" onClick={goToToday}>Today</Button>
                    <Button variant="outline" size="icon" onClick={goToNext}><ChevronRight className="h-4 w-4" /></Button>
                    <span className="font-semibold text-lg ml-4">{toolbar.label}</span>
                </div>
                <div className="flex items-center bg-muted p-1 rounded-md">
                    <Button 
                        variant={toolbar.view === 'month' ? 'default' : 'ghost'} 
                        size="sm" 
                        onClick={() => toolbar.onView('month')}
                        className="h-8"
                    >
                        Month
                    </Button>
                    <Button 
                        variant={toolbar.view === 'week' ? 'default' : 'ghost'} 
                        size="sm" 
                        onClick={() => toolbar.onView('week')}
                        className="h-8"
                    >
                        Week
                    </Button>
                    <Button 
                        variant={toolbar.view === 'day' ? 'default' : 'ghost'} 
                        size="sm" 
                        onClick={() => toolbar.onView('day')}
                        className="h-8"
                    >
                        Day
                    </Button>
                </div>
            </div>
        );
    };

    const CustomEvent = ({ event }: any) => {
        const isFullDay = event.resource?.hours === 8;
        const isHoliday = event.allDay && event.title === 'HOLIDAY';
        const isLeave = event.allDay && event.title === 'LEAVE';

        if (isHoliday || isLeave) {
            return (
                <div className="px-2 py-1 text-xs font-bold truncate">
                    {event.title}
                </div>
            );
        }

        return (
            <div className={cn(
                "flex flex-col h-full items-center justify-center p-1 overflow-hidden",
                isFullDay ? "bg-primary/90" : "bg-primary/70"
            )}>
                <span className="text-xs font-bold leading-none">{event.resource?.hours}h</span>
                {event.resource?.project_name && (
                    <span className="text-[10px] opacity-90 truncate w-full text-center mt-0.5">
                        {event.resource.project_name}
                    </span>
                )}
            </div>
        );
    };

    const eventPropGetter = (event: any) => {
        let style: any = {
            borderRadius: '6px',
            border: 'none',
            opacity: 1,
            display: 'block',
            padding: 0,
            overflow: 'hidden'
        };

        if (event.allDay) {
            if (event.title === 'HOLIDAY') {
                style.backgroundColor = '#10b981'; // emerald-500
            } else if (event.title === 'LEAVE') {
                style.backgroundColor = '#f59e0b'; // amber-500
            }
        } else {
            style.backgroundColor = 'transparent'; // Handled by Event component
        }

        return { style };
    };

    return (
        <div className="h-[700px] w-full bg-card rounded-lg border p-4 shadow-sm">
            <Calendar
                localizer={localizer}
                events={events}
                startAccessor="start"
                endAccessor="end"
                view={currentView}
                onView={setCurrentView}
                date={currentDate}
                onNavigate={setCurrentDate}
                selectable={true}
                onSelectSlot={onSelectSlot}
                onSelectEvent={onSelectEvent}
                eventPropGetter={eventPropGetter}
                components={{
                    toolbar: CustomToolbar,
                    event: CustomEvent
                }}
                allDayAccessor="allDay"
                min={new Date(0, 0, 0, 8, 0, 0)}
                max={new Date(0, 0, 0, 20, 0, 0)}
                className={cn(
                    "[&_.rbc-today]:bg-primary/5",
                    "[&_.rbc-event]:shadow-sm",
                    "[&_.rbc-off-range-bg]:bg-muted/30",
                    "font-sans"
                )}
            />
        </div>
    );
}
