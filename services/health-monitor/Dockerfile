FROM golang:1.26-alpine AS build
WORKDIR /src
COPY go.mod ./
COPY . .
RUN go build -o /health-monitor .

FROM alpine:3.21
WORKDIR /app
COPY --from=build /health-monitor /app/health-monitor
EXPOSE 8090
CMD ["/app/health-monitor"]

