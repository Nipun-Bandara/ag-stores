# Basic delivery routing suggestions

The delivery available-orders screen uses a replaceable `DeliveryRoutingEngine`
to suggest orders that may be practical to deliver together. Suggestions are
advisory: the delivery person must explicitly select orders before creating a
batch.

The current `BasicGeographicRoutingEngine` is a deterministic geographic
heuristic. It:

- calculates straight-line Haversine distance from the shop;
- calculates each destination's compass bearing from the shop;
- groups an order only when it is within 5 km of every existing group member;
- requires bearings within 45 degrees for every pair in a group;
- excludes invalid coordinates and leaves isolated valid orders ungrouped.

This is not road routing, travel-time estimation, automatic stop sequencing,
vehicle-capacity planning, or vehicle-routing optimization. Roads, traffic,
one-way restrictions, bridges, and actual driving time are not considered.

The service interface is deliberately independent of the page and database
repository. A future Google Routes, Mapbox, OR-Tools, or other optimization
adapter can replace the heuristic without changing selection or batch creation
logic.
